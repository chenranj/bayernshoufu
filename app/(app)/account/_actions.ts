
'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendShippingReminderAdminEmail } from '@/lib/email';

export async function remindSellerToShip(
  formData: FormData
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Please sign in first.');
  }

  const offerId = String(
    formData.get('offer_id') || ''
  ).trim();

  if (!offerId) {
    throw new Error('Offer ID is required.');
  }

  const admin = createAdminClient();

  // Confirm this offer belongs to the signed-in buyer.
  const { data: offer, error: offerError } = await admin
    .from('offers')
    .select(
      'id, user_id, jersey_id, status, shipped_at, shipping_reminder_sent_at'
    )
    .eq('id', offerId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (offerError || !offer) {
    throw new Error('Offer not found.');
  }

  if (offer.status !== 'paid' || offer.shipped_at) {
    throw new Error('This order is not awaiting shipment.');
  }

  // Atomically enforce the 24-hour limit.
  const { data: claimed, error: claimError } =
    await admin.rpc('claim_shipping_reminder', {
      p_offer_id: offerId,
      p_user_id: user.id,
    });

  if (claimError) {
    console.error('[remindSellerToShip] Claim failed', claimError);
    throw new Error('Unable to send reminder right now.');
  }

  if (!claimed) {
    throw new Error(
      'A reminder was already sent recently. Please wait 24 hours.'
    );
  }

  // Get jersey name.
  const { data: jersey } = await admin
    .from('jerseys')
    .select('name')
    .eq('id', offer.jersey_id)
    .maybeSingle();

  // Send reminder to the administrator.
  const emailSent = await sendShippingReminderAdminEmail({
    jerseyName: jersey?.name ?? 'Jersey',
    offerId,
    buyerEmail: user.email ?? null,
  });

  if (!emailSent) {
    // Release this attempt only if the timestamp is unchanged.
    // This avoids accidentally clearing a newer reminder.
    const { error: resetError } = await admin
      .from('offers')
      .update({
        shipping_reminder_sent_at:
          offer.shipping_reminder_sent_at,
      })
      .eq('id', offerId)
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .is('shipped_at', null);

    if (resetError) {
      console.error(
        '[remindSellerToShip] Reminder reset failed',
        resetError
      );
    }

    throw new Error(
      'The reminder email could not be sent. Please try again later.'
    );
  }

  revalidatePath('/account');
}
