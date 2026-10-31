import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import {
  createClient,
  createAdminClient,
} from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

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

    const body = await request.json();
    const jerseyId = body?.jerseyId;

    if (
      typeof jerseyId !== 'string' ||
      !jerseyId
    ) {
      return NextResponse.json(
        { error: 'Invalid jersey ID.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: jersey, error } = await admin
      .from('jerseys')
      .select(
        'id, name, price, buyer_premium, sale_type, is_sold'
      )
      .eq('id', jerseyId)
      .maybeSingle();

    if (error || !jersey) {
      return NextResponse.json(
        { error: 'Jersey not found.' },
        { status: 404 }
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
    const premiumPercent = Number(
      jersey.buyer_premium ?? 10
    );

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

    const session = await stripe.checkout.sessions.create({
      locale: 'en',
      mode: 'payment',
      customer_email: user.email || undefined,
      client_reference_id: jersey.id,

      line_items: lineItems,

      metadata: {
        purchase_type: 'fixed_price',
        jersey_id: jersey.id,
        user_id: user.id,
      },

      success_url:
        `${origin}/account?payment=success`,

      cancel_url:
        `${origin}/account?payment=cancelled`,
    });

    if (!session.url) {
      throw new Error(
        'Stripe did not return a checkout URL.'
      );
    }

    return NextResponse.json({
      url: session.url,
    });

  } catch (error) {
    console.error(
      '[Jersey Checkout]',
      error
    );

    return NextResponse.json(
      {
        error:
          'Unable to start payment. Please try again.',
      },
      { status: 500 }
    );
  }
}
