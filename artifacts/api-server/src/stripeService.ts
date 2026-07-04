import { storage } from './storage.js';
import { getUncachableStripeClient } from './stripeClient.js';

export class StripeService {
  /**
   * Find or create a Stripe Customer for the given email.
   * Also upserts the user row in our DB.
   */
  async findOrCreateCustomer(email: string): Promise<string> {
    const stripe = await getUncachableStripeClient();

    // Check our DB first
    let user = await storage.getUserByEmail(email);
    if (!user) user = await storage.upsertUser(email);

    if (user.stripe_customer_id) return user.stripe_customer_id;

    // Check Stripe for existing customer with this email
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      const customerId = existing.data[0].id;
      await storage.setStripeCustomerId(email, customerId);
      return customerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({ email });
    await storage.setStripeCustomerId(email, customer.id);
    return customer.id;
  }

  /** Create a Stripe Checkout session for a subscription. */
  async createCheckoutSession(opts: {
    email: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    /** 'card' (default) — credit/debit card only.
     *  'bank' — bank account only (ACH / SEPA / BECS etc.); Stripe verifies
     *  the account via Financial Connections before processing. */
    paymentCategory?: 'card' | 'bank';
  }): Promise<string> {
    const stripe = await getUncachableStripeClient();
    const customerId = await this.findOrCreateCustomer(opts.email);

    const isBank = opts.paymentCategory === 'bank';

    // Bank payment methods — Stripe picks the right one per region automatically.
    // us_bank_account (ACH), sepa_debit (EU), au_becs_debit (AU), acss_debit (CA).
    // Financial Connections verifies the account before charging.
    const bankMethods = ['us_bank_account', 'sepa_debit', 'au_becs_debit', 'acss_debit'] as const;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: isBank ? (bankMethods as unknown as string[]) : ['card'],
      line_items: [{ price: opts.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      payment_method_collection: 'if_required',
      subscription_data: {
        metadata: { email: opts.email },
      },
      allow_promotion_codes: true,
      // For bank accounts: require Financial Connections verification
      ...(isBank && {
        payment_method_options: {
          us_bank_account: {
            financial_connections: { permissions: ['payment_method'] },
            verification_method: 'automatic',
          },
        },
      }),
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return session.url;
  }

  /** Create a Stripe Billing Portal session so users can manage their subscription. */
  async createPortalSession(email: string, returnUrl: string): Promise<string> {
    const stripe = await getUncachableStripeClient();
    const customerId = await this.findOrCreateCustomer(email);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }
}

export const stripeService = new StripeService();
