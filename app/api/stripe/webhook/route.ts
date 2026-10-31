
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

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    const body = await request.text();

        let verifiedEvent: Stripe.Event | null = null;

    for (const secret of webhookSecrets) {
      try {
        verifiedEvent = stripe.webhooks.constructEvent(
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true });
    }

    const offerId = session.metadata?.offer_id;

    if (!offerId) {
      return NextResponse.json(
        { error: 'Missing offer ID.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Update payment status.
    // Only accepted offers can transition to paid.
    const { error: paymentError } = await admin
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

    if (paymentError) {
      console.error(
        '[Stripe Webhook] Database error:',
        paymentError
      );

      return NextResponse.json(
        { error: 'Database update failed.' },
        { status: 500 }
      );
    }

    // 2. Verify that this payment belongs to the offer.
    const { data: offer, error: offerError } = await admin
      .from('offers')
      .select(
        'id, jersey_id, accepted_amount, status, stripe_checkout_session_id'
      )
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error(
        '[Stripe Webhook] Offer lookup failed:',
        offerError
      );

      return NextResponse.json(
        { error: 'Offer lookup failed.' },
        { status: 500 }
      );
    }

    if (
      offer.status !== 'paid' ||
      offer.stripe_checkout_session_id !== session.id
    ) {
      console.error(
        '[Stripe Webhook] Payment session mismatch:',
        offerId
      );

      return NextResponse.json(
        { error: 'Payment session mismatch.' },
        { status: 409 }
      );
    }

      // Only LIVE payments mark a jersey as SOLD.
    // Sandbox payments keep the jersey available for sale.
    if (event.livemode) {
      const { error: soldError } = await admin
        .from('jerseys')
        .update({
          is_sold: true,
          sold_at: new Date().toISOString(),
        })
        .eq('id', offer.jersey_id)
        .eq('is_sold', false);

      if (soldError) {
        console.error(
          '[Stripe Webhook] Failed to mark jersey as SOLD:',
          soldError
        );

        return NextResponse.json(
          { error: 'Failed to mark jersey as SOLD.' },
          { status: 500 }
        );
      }
    }
    
    // 3. Claim notification atomically.
    const { data: claimed, error: claimError } =
      await admin.rpc('claim_payment_notification', {
        p_offer_id: offerId,
      });

    if (claimError) {
      console.error(
        '[Stripe Webhook] Notification claim error:',
        claimError
      );

      // Payment is already recorded. Allow Stripe to retry.
      return NextResponse.json(
        { error: 'Notification claim failed.' },
        { status: 500 }
      );
    }

    if (!claimed) {
      // Already sent, or another request is sending it.
      return NextResponse.json({ received: true });
    }

    // 4. Get jersey name for the email.
    const { data: jersey, error: jerseyError } = await admin
      .from('jerseys')
      .select('name')
      .eq('id', offer.jersey_id)
      .single();

    if (jerseyError) {
      console.error(
        '[Stripe Webhook] Jersey lookup error:',
        jerseyError
      );
    }

    // 5. Send administrator email.
    const emailSent = await sendPaymentReceivedAdminEmail({
      jerseyName: jersey?.name ?? 'Jersey',
      amount: Number(offer.accepted_amount ?? 0),
      buyerEmail: session.customer_details?.email ??
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
        .eq('id', offerId)
        .eq('payment_notification_status', 'sending');

      if (sentError) {
        console.error(
          '[Stripe Webhook] Notification status error:',
          sentError
        );
      }
    } else {
      const { error: resetError } = await admin
        .from('offers')
        .update({
          payment_notification_status: 'pending',
          payment_notification_claimed_at: null,
        })
        .eq('id', offerId)
        .eq('payment_notification_status', 'sending');

      if (resetError) {
        console.error(
          '[Stripe Webhook] Notification reset error:',
          resetError
        );
      }

      // Request a Stripe retry without changing PAID status.
      return NextResponse.json(
        { error: 'Payment recorded; notification failed.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
