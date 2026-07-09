import Stripe from 'stripe';

async function getStripeCredentials(): Promise<{ secretKey: string }> {
  if (process.env.STRIPE_SECRET_KEY) {
    return { secretKey: process.env.STRIPE_SECRET_KEY };
  }

  throw new Error('Missing Stripe credentials. Please configure STRIPE_SECRET_KEY.');
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}
