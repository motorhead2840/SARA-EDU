/**
 * Subscription routes — GDP-tiered pricing with fiat (Stripe) + crypto.
 *
 * Mounted at /api/subscription
 *
 * GET  /plans            — detect country → return tier + pricing (fiat & crypto)
 * POST /checkout/fiat    — create Stripe checkout session
 * POST /checkout/crypto  — create crypto payment record
 * GET  /crypto/status/:id — poll on-chain confirmation
 * GET  /status           — unified subscription status for email
 */

import { Router } from 'express';
import { countryToTier, detectCountryFromIp, TIER_USD, tierLabel } from '../lib/gdpTiers.js';
import { getCryptoPricesUsd, usdToCrypto, addUniqueOffset } from '../lib/coinGecko.js';
import { verifyPayment, walletAddress, networkLabel } from '../lib/paymentVerifier.js';
import {
  createCryptoPayment,
  getCryptoPayment,
  confirmPaymentAndActivate,
  isTxHashClaimed,
  expireOldPayments,
  getUserSubscription,
} from '../lib/subscriptionDb.js';
import { getTierPriceMap } from '../lib/stripeProducts.js';
import { stripeService } from '../stripeService.js';
import { storage } from '../storage.js';
import type { CryptoCurrency } from '../lib/coinGecko.js';

const router = Router();

// ─── GET /plans ───────────────────────────────────────────────────────────────

router.get('/plans', async (req, res) => {
  try {
    const clientIp =
      String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '';

    // Accept explicit country_code override (query param or header)
    const countryCode =
      String(req.query.country_code ?? req.headers['x-country-code'] ?? '') ||
      (await detectCountryFromIp(clientIp)) ||
      'US'; // fallback: US (high income)

    const tier     = countryToTier(countryCode);
    const usdPrice = TIER_USD[tier];

    // Fetch live crypto prices
    const cryptoPrices = await getCryptoPricesUsd();

    const cryptoAmounts: Record<CryptoCurrency, string> = {
      eth:  usdToCrypto(usdPrice, 'eth',  cryptoPrices.eth),
      usdc: usdToCrypto(usdPrice, 'usdc', cryptoPrices.usdc),
      btc:  usdToCrypto(usdPrice, 'btc',  cryptoPrices.btc),
      sara: usdToCrypto(usdPrice, 'sara', cryptoPrices.sara),
    };

    const wallets: Record<CryptoCurrency, string | null> = {
      eth:  walletAddress('eth'),
      usdc: walletAddress('usdc'),
      btc:  walletAddress('btc'),
      sara: walletAddress('sara'),
    };

    res.json({
      detected_country: countryCode,
      tier,
      tier_label: tierLabel(tier),
      usd_price: usdPrice,
      billing_period: 'monthly',
      features: ['content', 'certification'],
      fiat: {
        currency: 'USD',
        amount: usdPrice,
        provider: 'stripe',
      },
      crypto: {
        eth:  { amount: cryptoAmounts.eth,  usd_rate: cryptoPrices.eth,  wallet: wallets.eth,  network: networkLabel('eth'),  decimals: 6 },
        usdc: { amount: cryptoAmounts.usdc, usd_rate: cryptoPrices.usdc, wallet: wallets.usdc, network: networkLabel('usdc'), decimals: 2 },
        btc:  { amount: cryptoAmounts.btc,  usd_rate: cryptoPrices.btc,  wallet: wallets.btc,  network: networkLabel('btc'),  decimals: 8 },
        sara: { amount: cryptoAmounts.sara, usd_rate: cryptoPrices.sara, wallet: wallets.sara, network: networkLabel('sara'), decimals: 2 },
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load plans', detail: String(err) });
  }
});

// ─── POST /checkout/fiat ──────────────────────────────────────────────────────

router.post('/checkout/fiat', async (req, res) => {
  const { email, country_code } = req.body ?? {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const tier     = countryToTier(country_code ?? 'US');
    const priceMap = await getTierPriceMap();
    const priceId  = priceMap[tier];

    const baseUrl =
      req.headers.origin ||
      `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

    const url = await stripeService.createCheckoutSession({
      email,
      priceId,
      successUrl: `${baseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:  `${baseUrl}/subscribe`,
    });

    await storage.upsertUser(email);

    res.json({ url, tier, usd_price: TIER_USD[tier] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create checkout session', detail: String(err) });
  }
});

// ─── POST /checkout/crypto ────────────────────────────────────────────────────

router.post('/checkout/crypto', async (req, res) => {
  const { email, currency, country_code } = req.body ?? {};

  if (!email)    return res.status(400).json({ error: 'email is required' });
  if (!currency) return res.status(400).json({ error: 'currency is required (eth|usdc|btc|sara)' });

  const validCurrencies: CryptoCurrency[] = ['eth', 'usdc', 'btc', 'sara'];
  if (!validCurrencies.includes(currency)) {
    return res.status(400).json({ error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` });
  }

  const wallet = walletAddress(currency as CryptoCurrency);
  if (!wallet) {
    return res.status(503).json({
      error: `${currency.toUpperCase()} payments not yet configured`,
      detail: `Set CRYPTO_${currency === 'btc' ? 'BTC' : 'ETH'}_WALLET in environment secrets`,
    });
  }

  try {
    const tier      = countryToTier(country_code ?? 'US');
    const usdPrice  = TIER_USD[tier];
    const prices    = await getCryptoPricesUsd();
    const baseAmount = usdToCrypto(usdPrice, currency as CryptoCurrency, prices[currency as CryptoCurrency]);
    // Add unique offset so incoming txs can be loosely matched
    const cryptoAmount = addUniqueOffset(baseAmount, currency as CryptoCurrency);

    await storage.upsertUser(email);

    const payment = await createCryptoPayment({
      email,
      currency: currency as CryptoCurrency,
      tier,
      usdPrice,
      cryptoAmount,
      walletAddress: wallet,
    });

    res.json({
      payment_id:     payment.id,
      currency,
      network:        networkLabel(currency as CryptoCurrency),
      wallet_address: wallet,
      amount:         cryptoAmount,
      usd_equivalent: usdPrice,
      tier,
      expires_at:     payment.expires_at,
      instructions:   `Send exactly ${cryptoAmount} ${currency.toUpperCase()} to the address above within 30 minutes.`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create crypto payment', detail: String(err) });
  }
});

// ─── GET /crypto/status/:id ───────────────────────────────────────────────────

router.get('/crypto/status/:id', async (req, res) => {
  try {
    await expireOldPayments();

    const payment = await getCryptoPayment(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (payment.status === 'confirmed') {
      return res.json({ status: 'confirmed', tx_hash: payment.tx_hash, payment });
    }
    if (payment.status === 'expired') {
      return res.json({ status: 'expired', payment });
    }

    // Check on-chain
    const { confirmed, txHash } = await verifyPayment({
      currency:      payment.currency,
      cryptoAmount:  payment.crypto_amount,
      createdAt:     payment.created_at,
    });

    if (confirmed && txHash) {
      // Guard against replay: reject already-claimed tx hashes
      if (await isTxHashClaimed(txHash)) {
        return res.status(409).json({
          status: 'error',
          error: 'Transaction already used to activate another subscription',
          tx_hash: txHash,
        });
      }

      // Atomic confirm + activate in one DB transaction
      const activated = await confirmPaymentAndActivate({
        paymentId: payment.id,
        txHash,
        email:     payment.email,
        tier:      payment.tier,
        days:      30,
      });

      if (!activated) {
        // Race condition or tx collision — return pending so client retries
        return res.json({ status: 'pending', expires_in_ms: Math.max(0, payment.expires_at.getTime() - Date.now()), payment });
      }

      return res.json({ status: 'confirmed', tx_hash: txHash, payment });
    }

    const remaining = Math.max(0, payment.expires_at.getTime() - Date.now());
    res.json({
      status: 'pending',
      expires_in_ms: remaining,
      payment,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check payment status', detail: String(err) });
  }
});

// ─── GET /status ──────────────────────────────────────────────────────────────

router.get('/status', async (req, res) => {
  const email = String(req.query.email ?? '');
  if (!email) return res.status(400).json({ error: 'email query param required' });

  try {
    const status = await getUserSubscription(email);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get subscription status', detail: String(err) });
  }
});

export default router;
