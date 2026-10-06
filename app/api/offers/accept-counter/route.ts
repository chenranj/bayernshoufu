import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendBuyerAcceptedAdminEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Check login
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

    // Read offer ID
    const body = await request.json();

    const offerId = String(body.offer_id || '').trim();

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer is required.' },
        { status: 400 }
      );
    }

    // Read the offer BEFORE accepting it.
    // Buyer RLS ensures the logged-in buyer can only read
    // their own offer.
    const { data: offer, error: offerError } =
      await supabase
        .from('offers')
        .select(`
          id,
          jersey_id,
          current_amount,
          status
        `)
        .eq('id', offerId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (offerError) {
      console.error(
        '[accept-counter] offer lookup failed',
        offerError
      );

      return NextResponse.json(
        { error: 'Unable to read offer.' },
        { status: 500 }
      );
    }

    if (!offer || offer.status !== 'countered') {
      return NextResponse.json(
        {
          error:
            'This counter offer is no longer available.',
        },
        { status: 409 }
      );
    }

    // Get jersey name for the admin notification email.
    const { data: jersey, error: jerseyError } =
      await supabase
        .from('jerseys')
        .select('name')
        .eq('id', offer.jersey_id)
        .maybeSingle();

    if (jerseyError) {
      console.error(
        '[accept-counter] jersey lookup failed',
        jerseyError
      );
    }

    // Call secure Supabase function.
    // The database function verifies:
    // 1. The offer belongs to the logged-in buyer
    // 2. The offer is currently "countered"
    // 3. The accepted amount is the current seller counter
    // 4. The 24-hour payment window starts now
    const { data, error } = await supabase.rpc(
      'accept_counter_offer',
      {
        p_offer_id: offerId,
      }
    );

    if (error) {
      console.error(
        'Accept counter RPC error:',
        error
      );

      const message = error.message || '';

      if (
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('not available') ||
        message.toLowerCase().includes('counter')
      ) {
        return NextResponse.json(
          {
            error:
              'This counter offer is no longer available.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Unable to accept counter offer.' },
        { status: 500 }
      );
    }

    // Supabase RPC may return one row or an array depending
    // on the SQL function return type.
    const updatedOffer = Array.isArray(data)
      ? data[0] ?? null
      : data;

    if (!updatedOffer) {
      return NextResponse.json(
        {
          error:
            'This counter offer is no longer available.',
        },
        { status: 409 }
      );
    }

    // Notify Admin after the acceptance succeeds.
    // Email failure must NOT undo the accepted offer.
    try {
      await sendBuyerAcceptedAdminEmail({
        jerseyName: jersey?.name || 'Jersey',
        amount: Number(
          updatedOffer.accepted_amount ??
            offer.current_amount
        ),
        buyerEmail: user.email || null,
        paymentExpiresAt:
          updatedOffer.payment_expires_at || null,
      });
    } catch (emailError) {
      console.error(
        '[accept-counter] admin email failed',
        emailError
      );
    }

    return NextResponse.json({
      success: true,
      offer: updatedOffer,
      message: 'Counter offer accepted.',
    });
  } catch (error) {
    console.error(
      'Accept counter API error:',
      error
    );

    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
