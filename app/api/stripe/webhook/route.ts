
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { sendPaymentReceivedAdminEmail } from '@/lib/email';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');

  const webhookSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_LIVE_WEBHOOK_SECRET,
  ].filter((secret): secret is string => Boolean(secret));

  if (!signature || webhookSecrets.length === 0) {
    return NextResponse.json(
      { error: 'Webhook configuration missing.' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    let verifiedEvent: Stripe.Event | null = null;

    for (const secret of webhookSecrets) {
      try {
        verifiedEvent = getStripe().webhooks.constructEvent(
          body,
          signature,
          secret
        );
        break;
      } catch {
        // Try the next configured signing secret.
      }
    }

    if (!verifiedEvent) {
      throw new Error('No matching webhook signing secret.');
    }

    event = verifiedEvent;
  } catch (error) {
    console.error('[Stripe Webhook] Signature error:', error);

    return NextResponse.json(
      { error: 'Invalid webhook signature.' },
      { status: 400 }
    );
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true });
  }

  const orderId = session.metadata?.offer_id;

  if (!orderId) {
    console.error('[Stripe Webhook] Missing order ID:', session.id);

    return NextResponse.json(
      { error: 'Missing order ID.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 1. Load the order before confirming payment.
  const { data: order, error: orderError } = await admin
    .from('offers')
    .select(
      'id, jersey_id, user_id, purchase_type, status, accepted_amount, stripe_checkout_session_id'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) {
    console.error('[Stripe Webhook] Order lookup failed:', orderError);

    return NextResponse.json(
      { error: 'Order lookup failed.' },
      { status: 500 }
    );
  }

  // 2. Verify the Stripe Session belongs to this order.
  const metadata = session.metadata;

  if (
    session.mode !== 'payment' ||
    session.currency?.toLowerCase() !== 'usd' ||
    session.client_reference_id !== order.id ||
    metadata?.jersey_id !== order.jersey_id ||
    metadata?.user_id !== order.user_id ||
    (
      metadata?.purchase_type != null &&
      metadata.purchase_type !== order.purchase_type
    )
  ) {
    console.error('[Stripe Webhook] Session ownership mismatch:', session.id);

    return NextResponse.json(
      { error: 'Payment ownership mismatch.' },
      { status: 409 }
    );
  }

  if (
    order.stripe_checkout_session_id &&
    order.stripe_checkout_session_id !== session.id
  ) {
    console.error('[Stripe Webhook] Session ID mismatch:', session.id);

    return NextResponse.json(
      { error: 'Payment session mismatch.' },
      { status: 409 }
    );
  }

  // 3. Load jersey premium to verify the paid total.
  const { data: jersey, error: jerseyError } = await admin
    .from('jerseys')
    .select('name, buyer_premium')
    .eq('id', order.jersey_id)
    .maybeSingle();

  if (jerseyError || !jersey) {
    console.error('[Stripe Webhook] Jersey lookup failed:', jerseyError);

    return NextResponse.json(
      { error: 'Jersey lookup failed.' },
      { status: 500 }
    );
  }

  const acceptedAmount = Number(order.accepted_amount);
  const premiumPercent = Number(jersey.buyer_premium ?? 10);

  if (
    !Number.isFinite(acceptedAmount) ||
    acceptedAmount <= 0 ||
    !Number.isFinite(premiumPercent) ||
    premiumPercent < 0
  ) {
    return NextResponse.json(
      { error: 'Invalid order amount.' },
      { status: 409 }
    );
  }

  const amountCents = Math.round(acceptedAmount * 100);
  const premiumCents = Math.round(
    (amountCents * premiumPercent) / 100
  );
  const expectedTotalCents = amountCents + premiumCents;

  if (
    session.amount_total !== expectedTotalCents ||
    session.amount_subtotal !== expectedTotalCents
  ) {
    console.error('[Stripe Webhook] Payment amount mismatch:', {
      orderId,
      expectedTotalCents,
      receivedTotalCents: session.amount_total,
    });

    return NextResponse.json(
      { error: 'Payment amount mismatch.' },
      { status: 409 }
    );
  }

  // 4. Atomically confirm payment and LIVE SOLD status.
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const { data: confirmed, error: confirmationError } =
    await admin.rpc('confirm_checkout_payment', {
      p_order_id: order.id,
      p_session_id: session.id,
      p_payment_intent_id: paymentIntentId,
      p_is_live: event.livemode,
    });

  if (confirmationError || confirmed !== true) {
    console.error('[Stripe Webhook] Payment confirmation failed:', {
      orderId,
      confirmationError,
      confirmed,
    });

    return NextResponse.json(
      { error: 'Payment confirmation failed.' },
      { status: 500 }
    );
  }

  // 5. Claim seller notification once.
  const { data: claimed, error: claimError } =
    await admin.rpc('claim_payment_notification', {
      p_offer_id: order.id,
    });

  if (claimError) {
    console.error(
      '[Stripe Webhook] Notification claim error:',
      claimError
    );

    return NextResponse.json(
      { error: 'Notification claim failed.' },
      { status: 500 }
    );
  }

  if (!claimed) {
    return NextResponse.json({ received: true });
  }

  // 6. Send PAYMENT RECEIVED email.
  const emailSent = await sendPaymentReceivedAdminEmail({
    jerseyName: jersey.name ?? 'Jersey',
    amount: acceptedAmount,
    buyerEmail:
      session.customer_details?.email ??
      session.customer_email ??
      null,
  });

  if (emailSent) {
    const { error: sentError } = await admin
      .from('offers')
      .update({
        payment_notification_status: 'sent',
        payment_notification_sent_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('payment_notification_status', 'sending');

    if (sentError) {
      console.error(
        '[Stripe Webhook] Notification status error:',
        sentError
      );

      return NextResponse.json(
        { error: 'Notification status update failed.' },
        { status: 500 }
      );
    }
  } else {
    const { error: resetError } = await admin
      .from('offers')
      .update({
        payment_notification_status: 'pending',
        payment_notification_claimed_at: null,
      })
      .eq('id', order.id)
      .eq('payment_notification_status', 'sending');

    if (resetError) {
      console.error(
        '[Stripe Webhook] Notification reset error:',
        resetError
      );
    }

    return NextResponse.json(
      { error: 'Payment recorded; notification failed.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
