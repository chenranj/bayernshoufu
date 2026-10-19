
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook configuration missing.' },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    const body = await request.text();

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error('[Stripe Webhook] Signature error:', error);

    return NextResponse.json(
      { error: 'Invalid webhook signature.' },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === 'paid') {
      const offerId = session.metadata?.offer_id;

      if (!offerId) {
        return NextResponse.json(
          { error: 'Missing offer ID.' },
          { status: 400 }
        );
      }

      const admin = createAdminClient();

      const { error } = await admin
        .from('offers')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
        })
        .eq('id', offerId)
        .eq('status', 'accepted');

      if (error) {
        console.error('[Stripe Webhook] Database error:', error);

        return NextResponse.json(
          { error: 'Database update failed.' },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
