import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
