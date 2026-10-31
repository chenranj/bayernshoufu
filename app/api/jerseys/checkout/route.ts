
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import {
  createClient,
  createAdminClient,
} from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const RESERVATION_MINUTES = 35;
const CHECKOUT_MINUTES = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to continue.' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: 'Unable to verify your account.' },
        { status: 500 }
      );
    }

    if (profile?.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin accounts cannot purchase jerseys.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const jerseyId = body?.jerseyId;

    if (typeof jerseyId !== 'string' || !jerseyId) {
      return NextResponse.json(
        { error: 'Invalid jersey ID.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: jersey, error: jerseyError } = await admin
      .from('jerseys')
      .select(
        'id, name, price, buyer_premium, sale_type, is_sold, visibility'
      )
      .eq('id', jerseyId)
      .maybeSingle();

    if (jerseyError || !jersey) {
      return NextResponse.json(
        { error: 'Jersey not found.' },
        { status: 404 }
      );
    }

    if (jersey.visibility !== 'public') {
      return NextResponse.json(
        { error: 'This jersey is not available for purchase.' },
        { status: 403 }
      );
    }

    if (jersey.sale_type !== 'fixed_price') {
      return NextResponse.json(
        { error: 'This jersey is not available for direct purchase.' },
        { status: 400 }
      );
    }

    if (jersey.is_sold) {
      return NextResponse.json(
        { error: 'This jersey has already been sold.' },
        { status: 409 }
      );
    }

    const price = Number(jersey.price);
    const premiumPercent = Number(jersey.buyer_premium ?? 10);

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(premiumPercent) ||
      premiumPercent < 0
    ) {
      return NextResponse.json(
        { error: 'Invalid payment amount.' },
        { status: 400 }
      );
    }

    const amountCents = Math.round(price * 100);
    const premiumCents = Math.round(
      amountCents * premiumPercent / 100
    );

    // 1. Create a pending BUY NOW order.
    const { data: order, error: orderError } = await admin
      .from('offers')
      .insert({
        jersey_id: jersey.id,
        user_id: user.id,
        initial_amount: price,
        current_amount: price,
        accepted_amount: price,
        status: 'checkout_pending',
        purchase_type: 'fixed_price',
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('[Buy Now] Order creation failed:', orderError);

      return NextResponse.json(
        { error: 'Unable to create your order.' },
        { status: 500 }
      );
    }

    // 2. Atomically reserve the jersey in Supabase.
    const { data: reserved, error: reserveError } = await admin.rpc(
      'reserve_jersey_for_checkout',
      {
        p_jersey_id: jersey.id,
        p_order_id: order.id,
        p_reservation_minutes: RESERVATION_MINUTES,
      }
    );

    if (reserveError || reserved !== true) {
      console.error('[Buy Now] Reservation failed:', reserveError);

      await admin
        .from('offers')
        .delete()
        .eq('id', order.id)
        .eq('status', 'checkout_pending');

      return NextResponse.json(
        {
          error: reserveError
            ? 'Unable to reserve this jersey. Please try again.'
            : 'This jersey is currently reserved by another buyer. Please try again later.',
        },
        { status: reserveError ? 500 : 409 }
      );
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: jersey.name,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ];

    if (premiumCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Buyer's Premium (${premiumPercent}%)`,
          },
          unit_amount: premiumCents,
        },
        quantity: 1,
      });
    }

    const stripe = getStripe();
    const origin = request.nextUrl.origin;

    // Stripe Checkout expires after 30 minutes.
    // Supabase reservation lasts 35 minutes.
    const expiresAt = Math.floor(Date.now() / 1000) +
      CHECKOUT_MINUTES * 60;

    let session: Stripe.Checkout.Session;

    try {
      // 3. Create Stripe Checkout only after reservation succeeds.
      session = await stripe.checkout.sessions.create(
        {
          locale: 'en',
          mode: 'payment',
          customer_email: user.email || undefined,
          client_reference_id: order.id,
          line_items: lineItems,
          expires_at: expiresAt,

          metadata: {
            purchase_type: 'fixed_price',
            offer_id: order.id,
            jersey_id: jersey.id,
            user_id: user.id,
          },

          success_url: `${origin}/account?payment=success`,
          cancel_url: `${origin}/account?payment=cancelled`,
        },
        {
          idempotencyKey: `buy-now-${order.id}`,
        }
      );
   } catch (stripeError) {
  console.error('[Buy Now] Stripe error:', stripeError);

  // Keep the reservation until it expires.
  // Stripe may have created a Checkout Session
  // even if the API response failed.
  return NextResponse.json(
    {
      error:
        'Unable to confirm payment setup. This jersey is temporarily reserved. Please try again later.',
    },
    { status: 500 }
  );
}

    if (!session.url) {
      try {
        if (session.status === 'open') {
          await stripe.checkout.sessions.expire(session.id);
        }
      } catch (expireError) {
        console.error('[Buy Now] Session expiration failed:', expireError);
      }

      return NextResponse.json(
        { error: 'Stripe did not return a checkout URL.' },
        { status: 500 }
      );
    }

    // 4. Save the Stripe Session ID on the pending order.
    const { data: savedOrder, error: sessionError } = await admin
      .from('offers')
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq('id', order.id)
      .eq('status', 'checkout_pending')
      .select('id')
      .maybeSingle();

    if (sessionError || !savedOrder) {
      console.error(
        '[Buy Now] Unable to save Stripe session:',
        sessionError
      );

      try {
        if (session.status === 'open') {
          await stripe.checkout.sessions.expire(session.id);
        }
      } catch (expireError) {
        console.error(
          '[Buy Now] Unable to expire Stripe session:',
          expireError
        );
      }

      return NextResponse.json(
        { error: 'Unable to prepare payment. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('[Jersey Checkout]', error);

    return NextResponse.json(
      {
        error: 'Unable to start payment. Please try again.',
      },
      { status: 500 }
    );
  }
}
