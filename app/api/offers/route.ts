import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // 2. 读取提交内容
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
    const normalizedAmount = Math.round(amount * 100) / 100;

    // 3. 确认球衣存在，而且确实是 By Offer Only
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

    // 4. 创建 Offer
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

    // 5. 创建第一条报价消息
    const { error: messageError } = await supabase
      .from('offer_messages')
      .insert({
        offer_id: offer.id,
        sender_id: user.id,
        amount: normalizedAmount,
        message: message || null,
      });

    if (messageError) {
      console.error('Create offer message error:', messageError);

      // 如果第一条消息创建失败，删除刚刚创建的 offer，
      // 避免留下不完整的数据。
      await supabase
        .from('offers')
        .delete()
        .eq('id', offer.id);

      return NextResponse.json(
        { error: 'Unable to submit your offer.' },
        { status: 500 }
      );
    }

    // 6. 成功
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
