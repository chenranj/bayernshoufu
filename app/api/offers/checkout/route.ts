
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
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
    const offerId = body?.offerId;

    if (typeof offerId !== 'string' || !offerId) {
      return NextResponse.json(
        { error: 'Invalid offer ID.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: offer, error } = await admin
      .from('offers')
      .select(
        'id, user_id, jersey_id, status, accepted_amount, payment_expires_at'
      )
      .eq('id', offerId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !offer) {
      return NextResponse.json(
        { error: 'Offer not found.' },
        { status: 404 }
      );
    }

    if (offer.status !== 'accepted') {
      return NextResponse.json(
        { error: 'This offer is not awaiting payment.' },
        { status: 400 }
      );
    }

    if (
      !offer.payment_expires_at ||
      new Date(offer.payment_expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: 'The payment deadline has expired.' },
        { status: 400 }
      );
    }

    const { data: jersey } = await admin
      .from('jerseys')
      .select('name, buyer_premium')
      .eq('id', offer.jersey_id)
      .single();

    if (!jersey) {
      return NextResponse.json(
        { error: 'Jersey not found.' },
        { status: 404 }
      );
    }

    const acceptedAmount = Number(offer.accepted_amount);
    const premiumPercent = Number(jersey.buyer_premium ?? 10);

    if (
      !Number.isFinite(acceptedAmount) ||
      acceptedAmount <= 0 ||
      !Number.isFinite(premiumPercent) ||
      premiumPercent < 0
    ) {
      return NextResponse.json(
        { error: 'Invalid payment amount.' },
        { status: 400 }
      );
    }

    const amountCents = Math.round(acceptedAmount * 100);
    const premiumCents = Math.round(
      (amountCents * premiumPercent) / 100
    );
    const totalCents = amountCents + premiumCents;

    const stripe = getStripe();

    const origin = request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      locale: 'en',
      mode: 'payment',
      customer_email: user.email || undefined,
      client_reference_id: offer.id,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: jersey.name,
              description: 'Accepted jersey offer',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Buyer's Premium (${premiumPercent}%)`,
            },
            unit_amount: premiumCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        offer_id: offer.id,
        user_id: user.id,
        jersey_id: offer.jersey_id,
      },
      expires_at: Math.floor(
        Math.min(
          new Date(offer.payment_expires_at).getTime(),
          Date.now() + 24 * 60 * 60 * 1000
        ) / 1000
      ),
      success_url: `${origin}/account?payment=success`,
      cancel_url: `${origin}/account?payment=cancelled`,
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL.');
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Checkout]', error);

    return NextResponse.json(
      { error: 'Unable to start payment. Please try again.' },
      { status: 500 }
    );
  }
}
