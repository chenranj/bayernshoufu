
import Stripe from 'stripe';

export function getStripe() {
  const isProduction =
    process.env.VERCEL_ENV === 'production';

  const secretKey = isProduction
    ? process.env.STRIPE_LIVE_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      isProduction
        ? 'STRIPE_LIVE_SECRET_KEY is not configured'
        : 'STRIPE_SECRET_KEY is not configured'
    );
  }

  return new Stripe(secretKey);
}
