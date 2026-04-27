'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import crypto from 'node:crypto';

async function ensureAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Forbidden');
  return user;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uploadToBucket(bucket: 'jerseys' | 'players' | 'banners', file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safe = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
  const key = `${crypto.randomUUID()}.${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).upload(key, buf, {
    contentType: file.type || `image/${safe}`,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return key;
}

async function removeFromBucket(bucket: 'jerseys' | 'players' | 'banners', path: string | null) {
  if (!path) return;
  const admin = createAdminClient();
  await admin.storage.from(bucket).remove([path]);
}

// =============================================================================
// SEASONS
// =============================================================================
export async function createSeason(formData: FormData) {
  await ensureAdmin();
  const label = String(formData.get('label') || '').trim();
  const yearStart = Number(formData.get('year_start'));
  const yearEnd = Number(formData.get('year_end'));
  const sortOrder = Number(formData.get('sort_order') || 0);
  if (!label || !yearStart || !yearEnd) throw new Error('Missing fields');

  const admin = createAdminClient();
  const slug = slugify(label) || `${yearStart}-${yearEnd}`;
  const { error } = await admin.from('seasons').insert({
    label,
    year_start: yearStart,
    year_end: yearEnd,
    slug,
    sort_order: sortOrder,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/seasons');
}

export async function updateSeason(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const label = String(formData.get('label') || '').trim();
  const yearStart = Number(formData.get('year_start'));
  const yearEnd = Number(formData.get('year_end'));
  const sortOrder = Number(formData.get('sort_order') || 0);
  const admin = createAdminClient();
  const { error } = await admin
    .from('seasons')
    .update({ label, year_start: yearStart, year_end: yearEnd, sort_order: sortOrder, slug: slugify(label) })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/seasons');
}

export async function deleteSeason(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const admin = createAdminClient();
  const { error } = await admin.from('seasons').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/seasons');
}

// =============================================================================
// PLAYERS
// =============================================================================
export async function createPlayer(formData: FormData) {
  await ensureAdmin();
  const fullName = String(formData.get('full_name') || '').trim();
  const shirtNumber = formData.get('shirt_number') ? Number(formData.get('shirt_number')) : null;
  const position = String(formData.get('position') || '').trim() || null;
  const isLegend = formData.get('is_legend') === 'on';
  const bio = String(formData.get('bio') || '').trim() || null;
  const sortOrder = Number(formData.get('sort_order') || 0);
  const photo = formData.get('photo') as File | null;
  if (!fullName) throw new Error('Name required');

  let photoPath: string | null = null;
  if (photo && photo.size > 0) photoPath = await uploadToBucket('players', photo);

  const admin = createAdminClient();
  const { error } = await admin.from('players').insert({
    full_name: fullName,
    slug: slugify(fullName),
    shirt_number: shirtNumber,
    position,
    is_legend: isLegend,
    bio,
    sort_order: sortOrder,
    photo_path: photoPath,
  });
  if (error) {
    if (photoPath) await removeFromBucket('players', photoPath);
    throw new Error(error.message);
  }
  revalidatePath('/admin/players');
}

export async function updatePlayer(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const fullName = String(formData.get('full_name') || '').trim();
  const shirtNumber = formData.get('shirt_number') ? Number(formData.get('shirt_number')) : null;
  const position = String(formData.get('position') || '').trim() || null;
  const isLegend = formData.get('is_legend') === 'on';
  const bio = String(formData.get('bio') || '').trim() || null;
  const sortOrder = Number(formData.get('sort_order') || 0);
  const photo = formData.get('photo') as File | null;

  const admin = createAdminClient();
  const update: Record<string, unknown> = {
    full_name: fullName,
    slug: slugify(fullName),
    shirt_number: shirtNumber,
    position,
    is_legend: isLegend,
    bio,
    sort_order: sortOrder,
  };
  if (photo && photo.size > 0) {
    const { data: existing } = await admin
      .from('players')
      .select('photo_path')
      .eq('id', id)
      .maybeSingle();
    const newPath = await uploadToBucket('players', photo);
    update.photo_path = newPath;
    if (existing?.photo_path) await removeFromBucket('players', existing.photo_path);
  }
  const { error } = await admin.from('players').update(update).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/players');
}

export async function deletePlayer(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('players')
    .select('photo_path')
    .eq('id', id)
    .maybeSingle();
  const { error } = await admin.from('players').delete().eq('id', id);
  if (error) throw new Error(error.message);
  if (existing?.photo_path) await removeFromBucket('players', existing.photo_path);
  revalidatePath('/admin/players');
}

// =============================================================================
// JERSEYS
// =============================================================================
export async function createJersey(formData: FormData) {
  await ensureAdmin();
  const name = String(formData.get('name') || '').trim();
  const seasonId = String(formData.get('season_id') || '');
  const kitType = String(formData.get('kit_type') || 'home');
  const description = String(formData.get('description') || '').trim() || null;
  const releaseYear = formData.get('release_year') ? Number(formData.get('release_year')) : null;
  const sortOrder = Number(formData.get('sort_order') || 0);
  const playerIds = formData.getAll('player_ids').map(String).filter(Boolean);
  const image = formData.get('image') as File | null;
  if (!name || !seasonId || !image || image.size === 0) throw new Error('Name, season, and image required');

  const imagePath = await uploadToBucket('jerseys', image);
  const admin = createAdminClient();

  const { data: jersey, error } = await admin
    .from('jerseys')
    .insert({
      name,
      season_id: seasonId,
      kit_type: kitType,
      description,
      release_year: releaseYear,
      sort_order: sortOrder,
      image_path: imagePath,
    })
    .select('id')
    .single();

  if (error || !jersey) {
    await removeFromBucket('jerseys', imagePath);
    throw new Error(error?.message ?? 'Insert failed');
  }

  if (playerIds.length) {
    const rows = playerIds.map((pid) => ({ jersey_id: jersey.id, player_id: pid }));
    await admin.from('jersey_players').insert(rows);
  }
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
}

export async function updateJersey(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const name = String(formData.get('name') || '').trim();
  const seasonId = String(formData.get('season_id') || '');
  const kitType = String(formData.get('kit_type') || 'home');
  const description = String(formData.get('description') || '').trim() || null;
  const releaseYear = formData.get('release_year') ? Number(formData.get('release_year')) : null;
  const sortOrder = Number(formData.get('sort_order') || 0);
  const playerIds = formData.getAll('player_ids').map(String).filter(Boolean);
  const image = formData.get('image') as File | null;

  const admin = createAdminClient();
  const update: Record<string, unknown> = {
    name,
    season_id: seasonId,
    kit_type: kitType,
    description,
    release_year: releaseYear,
    sort_order: sortOrder,
  };
  if (image && image.size > 0) {
    const { data: existing } = await admin
      .from('jerseys')
      .select('image_path')
      .eq('id', id)
      .maybeSingle();
    const newPath = await uploadToBucket('jerseys', image);
    update.image_path = newPath;
    if (existing?.image_path) await removeFromBucket('jerseys', existing.image_path);
  }
  const { error } = await admin.from('jerseys').update(update).eq('id', id);
  if (error) throw new Error(error.message);

  await admin.from('jersey_players').delete().eq('jersey_id', id);
  if (playerIds.length) {
    const rows = playerIds.map((pid) => ({ jersey_id: id, player_id: pid }));
    await admin.from('jersey_players').insert(rows);
  }
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
}

export async function deleteJersey(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('jerseys')
    .select('image_path')
    .eq('id', id)
    .maybeSingle();
  const { error } = await admin.from('jerseys').delete().eq('id', id);
  if (error) throw new Error(error.message);
  if (existing?.image_path) await removeFromBucket('jerseys', existing.image_path);
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
}

// =============================================================================
// BANNERS
// =============================================================================
export async function createBanner(formData: FormData) {
  await ensureAdmin();
  const caption = String(formData.get('caption') || '').trim() || null;
  const sortOrder = Number(formData.get('sort_order') || 0);
  const active = formData.get('active') !== 'off';
  const image = formData.get('image') as File | null;
  if (!image || image.size === 0) throw new Error('Image required');

  const path = await uploadToBucket('banners', image);
  const admin = createAdminClient();
  const { error } = await admin
    .from('banners')
    .insert({ image_path: path, caption, sort_order: sortOrder, active });
  if (error) {
    await removeFromBucket('banners', path);
    throw new Error(error.message);
  }
  revalidatePath('/admin/banners');
  revalidatePath('/login');
}

export async function updateBanner(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const caption = String(formData.get('caption') || '').trim() || null;
  const sortOrder = Number(formData.get('sort_order') || 0);
  const active = formData.get('active') !== 'off';
  const image = formData.get('image') as File | null;

  const admin = createAdminClient();
  const update: Record<string, unknown> = { caption, sort_order: sortOrder, active };
  if (image && image.size > 0) {
    const { data: existing } = await admin
      .from('banners')
      .select('image_path')
      .eq('id', id)
      .maybeSingle();
    const newPath = await uploadToBucket('banners', image);
    update.image_path = newPath;
    if (existing?.image_path) await removeFromBucket('banners', existing.image_path);
  }
  const { error } = await admin.from('banners').update(update).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/banners');
  revalidatePath('/login');
}

export async function deleteBanner(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('banners')
    .select('image_path')
    .eq('id', id)
    .maybeSingle();
  const { error } = await admin.from('banners').delete().eq('id', id);
  if (error) throw new Error(error.message);
  if (existing?.image_path) await removeFromBucket('banners', existing.image_path);
  revalidatePath('/admin/banners');
  revalidatePath('/login');
}

export async function updateBannerSettings(formData: FormData) {
  await ensureAdmin();
  const interval = Number(formData.get('banner_interval_seconds') || 6);
  const fade = Number(formData.get('banner_fade_ms') || 1200);
  const admin = createAdminClient();
  await admin.from('site_settings').upsert([
    { key: 'banner_interval_seconds', value: interval },
    { key: 'banner_fade_ms', value: fade },
  ]);
  revalidatePath('/admin/banners');
  revalidatePath('/login');
}

// =============================================================================
// USERS
// =============================================================================
export async function inviteUser(formData: FormData) {
  await ensureAdmin();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const makeAdmin = formData.get('role') === 'admin';
  if (!email) throw new Error('Email required');

  const admin = createAdminClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || '';
  const redirectTo = origin
    ? `${origin}/auth/callback?next=/auth/set-password`
    : undefined;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) throw new Error(error.message);

  if (makeAdmin && data?.user) {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
  }
  revalidatePath('/admin/users');
}

export async function setUserRole(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const role = String(formData.get('role')) === 'admin' ? 'admin' : 'user';
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ role }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/users');
}

export async function deleteUser(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/users');
}
