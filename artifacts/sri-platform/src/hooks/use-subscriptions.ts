export type TierType = 'high' | 'middle' | 'low';

export interface CryptoPlan {
  amount: string;
  usd_rate: number;
  wallet: string;
  network: string;
}

export interface PlanDetails {
  detected_country: string;
  tier: TierType;
  tier_label: string;
  usd_price: number;
  crypto: {
    eth: CryptoPlan;
    usdc: CryptoPlan;
    btc: CryptoPlan;
    sara: CryptoPlan;
  };
}

export interface SubscriptionStatus {
  active: boolean;
  tier?: TierType;
  source?: 'fiat' | 'crypto';
  expires_at?: string;
  features?: string[];
}

export interface CheckoutFiatResponse {
  url: string;
}

export interface CheckoutCryptoResponse {
  payment_id: string;
  wallet_address: string;
  amount: string;
  currency: string;
  expires_at: string;
}

export interface CryptoStatusResponse {
  status: 'pending' | 'confirmed' | 'expired';
}

export const useSubscriptionHooks = () => {
  // 1. GET /api/subscription/plans?country_code=XX
  const getPlans = async (countryCode?: string): Promise<PlanDetails> => {
    const query = countryCode ? `?country_code=${encodeURIComponent(countryCode)}` : '';
    const response = await fetch(`/api/subscription/plans${query}`);
    if (!response.ok) {
      throw new Error('Failed to fetch plans');
    }
    return response.json();
  };

  // 2. GET /api/subscription/status?email=X
  const getStatus = async (email: string): Promise<SubscriptionStatus> => {
    const response = await fetch(`/api/subscription/status?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }
    return response.json();
  };

  // 3. POST /api/subscription/checkout/fiat
  const checkoutFiat = async (email: string, countryCode: string): Promise<CheckoutFiatResponse> => {
    const response = await fetch(`/api/subscription/checkout/fiat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, country_code: countryCode }),
    });
    if (!response.ok) {
      throw new Error('Failed to checkout fiat');
    }
    return response.json();
  };

  // 4. POST /api/subscription/checkout/crypto
  const checkoutCrypto = async (email: string, currency: string, countryCode: string): Promise<CheckoutCryptoResponse> => {
    const response = await fetch(`/api/subscription/checkout/crypto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, currency, country_code: countryCode }),
    });
    if (!response.ok) {
      throw new Error('Failed to checkout crypto');
    }
    return response.json();
  };

  // 5. GET /api/subscription/crypto/status/:paymentId
  const getCryptoStatus = async (paymentId: string): Promise<CryptoStatusResponse> => {
    const response = await fetch(`/api/subscription/crypto/status/${encodeURIComponent(paymentId)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch crypto payment status');
    }
    return response.json();
  };

  return {
    getPlans,
    getStatus,
    checkoutFiat,
    checkoutCrypto,
    getCryptoStatus
  };
};
