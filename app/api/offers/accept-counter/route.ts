import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // 1. Check login
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Please log in.' },
        { status: 401 }
      );
    }

    // 2. Read offer ID
    const body = await request.json();

    const offerId = String(body.offer_id || '').trim();

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer is required.' },
        { status: 400 }
      );
    }

    // 3. Load the offer
    // RLS ensures the buyer can only read their own offer.
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(
        'id, user_id, current_amount, status, payment_expires_at'
      )
      .eq('id', offerId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (offerError) {
      console.error('Load offer error:', offerError);

      return NextResponse.json(
        { error: 'Unable to load offer.' },
        { status: 500 }
      );
    }

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found.' },
        { status: 404 }
      );
    }

    // 4. Only a seller counter can be accepted here
    if (offer.status !== 'countered') {
      return NextResponse.json(
        {
          error:
            'This counter offer is no longer available.',
        },
        { status: 400 }
      );
    }

    const acceptedAmount = Number(offer.current_amount);

    if (
      !Number.isFinite(acceptedAmount) ||
      acceptedAmount <= 0
    ) {
      return NextResponse.json(
        { error: 'Invalid offer amount.' },
        { status: 400 }
      );
    }

    // 5. Start 24-hour payment window
    const paymentExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    // 6. Accept seller counter
    const { data: updatedOffer, error: updateError } =
      await supabase
        .from('offers')
        .update({
          status: 'accepted',
          accepted_amount: acceptedAmount,
          payment_expires_at: paymentExpiresAt,
        })
        .eq('id', offer.id)
        .eq('user_id', user.id)
        .eq('status', 'countered')
        .select(
          'id, status, accepted_amount, payment_expires_at'
        )
        .maybeSingle();

    if (updateError) {
      console.error(
        'Accept counter update error:',
        updateError
      );

      return NextResponse.json(
        { error: 'Unable to accept counter offer.' },
        { status: 500 }
      );
    }

    if (!updatedOffer) {
      return NextResponse.json(
        {
          error:
            'This counter offer is no longer available.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      offer: updatedOffer,
      message: 'Counter offer accepted.',
    });
  } catch (error) {
    console.error('Accept counter API error:', error);

    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
