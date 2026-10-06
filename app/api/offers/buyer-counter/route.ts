import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendBuyerCounterAdminEmail } from '@/lib/email';

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

    // 2. Read request
    const body = await request.json();

    const offerId = String(body.offer_id || '').trim();
    const amount = Number(body.amount);
    const message = String(body.message || '').trim();

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer is required.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid counter amount.' },
        { status: 400 }
      );
    }

    const normalizedAmount =
      Math.round(amount * 100) / 100;

    // 3. Get jersey information before the RPC
    // so we can use it in the admin notification email.
    const { data: existingOffer, error: offerLookupError } =
      await supabase
        .from('offers')
        .select('id, jersey_id')
        .eq('id', offerId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (offerLookupError) {
      console.error(
        'Buyer counter offer lookup error:',
        offerLookupError
      );
    }

    let jerseyName = 'Jersey';

    if (existingOffer?.jersey_id) {
      const { data: jersey, error: jerseyError } =
        await supabase
          .from('jerseys')
          .select('name')
          .eq('id', existingOffer.jersey_id)
          .maybeSingle();

      if (jerseyError) {
        console.error(
          'Buyer counter jersey lookup error:',
          jerseyError
        );
      }

      if (jersey?.name) {
        jerseyName = jersey.name;
      }
    }

    // 4. Secure database RPC:
    // - verifies this offer belongs to the logged-in buyer
    // - only allows countering a seller "countered" offer
    // - changes status back to pending
    // - updates current_amount
    // - writes buyer message into offer history
    const { data, error } = await supabase.rpc(
      'buyer_counter_offer',
      {
        p_offer_id: offerId,
        p_amount: normalizedAmount,
        p_message: message || null,
      }
    );

    if (error) {
      console.error('Buyer counter RPC error:', error);

      const errorMessage = (
        error.message || ''
      ).toLowerCase();

      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('not available') ||
        errorMessage.includes('countering')
      ) {
        return NextResponse.json(
          {
            error:
              'This offer is no longer available for countering.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Unable to submit counter offer.' },
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
            'This offer is no longer available for countering.',
        },
        { status: 409 }
      );
    }

    // 5. Notify Admin.
    // Email failure must not undo the buyer's counter offer.
    try {
      await sendBuyerCounterAdminEmail({
        jerseyName,
        amount: normalizedAmount,
        buyerEmail: user.email ?? null,
        message: message || null,
      });
    } catch (emailError) {
      console.error(
        'Buyer counter admin email failed:',
        emailError
      );
    }

    // 6. Success
    return NextResponse.json({
      success: true,
      offer: updatedOffer,
      message: 'Your counter offer has been submitted.',
    });
  } catch (error) {
    console.error('Buyer counter API error:', error);

    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
