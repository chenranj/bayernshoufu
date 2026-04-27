import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { jersey_id, favorite } = await request.json();
  if (!jersey_id) return NextResponse.json({ error: 'jersey_id required' }, { status: 400 });

  if (favorite) {
    const { error } = await supabase
      .from('favorite_jerseys')
      .upsert({ user_id: user.id, jersey_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('favorite_jerseys')
      .delete()
      .eq('user_id', user.id)
      .eq('jersey_id', jersey_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
