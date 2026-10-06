import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendBuyerDeclinedAdminEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Must be logged in.
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

    // Read request.
    const body = await request.json();

    const offerId = String(
      body.offer_id || ''
    ).trim();

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer is required.' },
        { status: 400 }
      );
    }

    // Get offer information BEFORE the RPC changes its status.
    // Buyer RLS allows the buyer to read their own offer.
    const {
      data: offer,
      error: offerError,
    } = await supabase
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
        '[buyer-decline] offer lookup failed',
        offerError
      );

      return NextResponse.json(
        { error: 'Unable to load offer.' },
        { status: 500 }
      );
    }

    if (!offer) {
      return NextResponse.json(
        {
          error:
            'This offer is no longer available for declining.',
        },
        { status: 409 }
      );
    }

    // Get jersey name for the admin email.
    const {
      data: jersey,
      error: jerseyError,
    } = await supabase
      .from('jerseys')
      .select('name')
      .eq('id', offer.jersey_id)
      .maybeSingle();

    if (jerseyError) {
      console.error(
        '[buyer-decline] jersey lookup failed',
        jerseyError
      );
    }

    // Secure RPC:
    // - verifies the offer belongs to this buyer
    // - only allows decline after seller counter
    // - changes status to declined
    // - writes decline into offer history
    const { data, error } = await supabase.rpc(
      'buyer_decline_offer',
      {
        p_offer_id: offerId,
      }
    );

    if (error) {
      console.error(
        'Buyer decline RPC error:',
        error
      );

      const errorMessage = (
        error.message || ''
      ).toLowerCase();

      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('not available') ||
        errorMessage.includes('declining')
      ) {
        return NextResponse.json(
          {
            error:
              'This offer is no longer available for declining.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'Unable to decline offer.',
        },
        { status: 500 }
      );
    }

    const updatedOffer = Array.isArray(data)
      ? data[0] ?? null
      : data;

    if (!updatedOffer) {
      return NextResponse.json(
        {
          error:
            'This offer is no longer available for declining.',
        },
        { status: 409 }
      );
    }

    // Send notification email to admin.
    // Email failure must NOT undo the buyer's decline.
    try {
      await sendBuyerDeclinedAdminEmail({
        jerseyName: jersey?.name || 'Jersey',
        amount: Number(offer.current_amount),
        buyerEmail: user.email || null,
      });
    } catch (emailError) {
      console.error(
        '[buyer-decline] admin email failed',
        emailError
      );
    }

    return NextResponse.json({
      success: true,
      offer: updatedOffer,
      message: 'Offer declined.',
    });
  } catch (error) {
    console.error(
      'Buyer decline API error:',
      error
    );

    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
