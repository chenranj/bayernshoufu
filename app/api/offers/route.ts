import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNewOfferAdminEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // 1. 必须登录
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Please log in to make an offer.' },
        { status: 401 }
      );
    }

    // 2. Admin 不允许 Make Offer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError);

      return NextResponse.json(
        { error: 'Unable to verify your account.' },
        { status: 500 }
      );
    }

    if (profile?.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin accounts cannot make offers.' },
        { status: 403 }
      );
    }

    // 3. 读取提交内容
    const body = await request.json();

    const jerseyId = String(body.jersey_id || '').trim();
    const amount = Number(body.amount);
    const message = String(body.message || '').trim();

    if (!jerseyId) {
      return NextResponse.json(
        { error: 'Jersey is required.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid offer amount.' },
        { status: 400 }
      );
    }

    // 金额最多保留两位小数
    const normalizedAmount =
      Math.round(amount * 100) / 100;

    // 4. 确认球衣存在，而且确实是 By Offer Only
    const { data: jersey, error: jerseyError } = await supabase
      .from('jerseys')
      .select('id, name, sale_type')
      .eq('id', jerseyId)
      .single();

    if (jerseyError || !jersey) {
      return NextResponse.json(
        { error: 'Jersey not found.' },
        { status: 404 }
      );
    }

    if (jersey.sale_type !== 'offer_only') {
      return NextResponse.json(
        { error: 'This jersey is not available for offers.' },
        { status: 400 }
      );
    }

    // 5. 创建 Offer
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        jersey_id: jerseyId,
        user_id: user.id,
        initial_amount: normalizedAmount,
        current_amount: normalizedAmount,
        status: 'pending',
      })
      .select('id')
      .single();

    if (offerError || !offer) {
      console.error('Create offer error:', offerError);

      return NextResponse.json(
        { error: 'Unable to submit your offer.' },
        { status: 500 }
      );
    }

    // 6. 创建第一条报价消息
    const { error: messageError } = await supabase
      .from('offer_messages')
      .insert({
        offer_id: offer.id,
        sender_id: user.id,
        amount: normalizedAmount,
        message: message || null,
      });

    if (messageError) {
      console.error(
        'Create offer message error:',
        messageError
      );

      await supabase
        .from('offers')
        .delete()
        .eq('id', offer.id);

      return NextResponse.json(
        { error: 'Unable to submit your offer.' },
        { status: 500 }
      );
    }

    // 7. 通知 Admin
    // 邮件发送失败不会影响 Offer 本身提交成功。
    try {
      await sendNewOfferAdminEmail({
        jerseyName: jersey.name,
        amount: normalizedAmount,
        buyerEmail: user.email ?? null,
        message: message || null,
      });
    } catch (emailError) {
      console.error(
        'New offer admin email failed:',
        emailError
      );
    }

    // 8. 成功
    return NextResponse.json({
      success: true,
      offer_id: offer.id,
      message: 'Your offer has been submitted.',
    });
  } catch (error) {
    console.error('Offer API error:', error);

    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
