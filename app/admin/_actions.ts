'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import crypto from 'node:crypto';

function currentOrigin(): string | undefined {
  // Prefer the request's actual host so multi-domain deployments work
  // without a hardcoded NEXT_PUBLIC_SITE_URL.
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // headers() unavailable outside request context (e.g. scripts)
  }
  return process.env.NEXT_PUBLIC_SITE_URL || undefined;
}

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

function flashRedirect(path: string, msg = 'Saved!') {
  redirect(`${path}?saved=${encodeURIComponent(msg)}`);
}

function flashError(path: string, msg: string) {
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
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
  if (!label || !yearStart || !yearEnd) {
    revalidatePath('/admin/seasons');
    flashError('/admin/seasons', 'Missing fields');
  }

  const admin = createAdminClient();
  const slug = slugify(label) || `${yearStart}-${yearEnd}`;
  const { error } = await admin.from('seasons').insert({
    label,
    year_start: yearStart,
    year_end: yearEnd,
    slug,
    sort_order: sortOrder,
  });
  if (error) {
    revalidatePath('/admin/seasons');
    flashError('/admin/seasons', error.message);
  }
  revalidatePath('/admin/seasons');
  flashRedirect('/admin/seasons', 'Season added');
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
  if (error) {
    revalidatePath('/admin/seasons');
    flashError('/admin/seasons', error.message);
  }
  revalidatePath('/admin/seasons');
  flashRedirect('/admin/seasons', 'Saved!');
}

export async function deleteSeason(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const admin = createAdminClient();
  const { error } = await admin.from('seasons').delete().eq('id', id);
  if (error) {
    revalidatePath('/admin/seasons');
    flashError('/admin/seasons', error.message);
  }
  revalidatePath('/admin/seasons');
  flashRedirect('/admin/seasons', 'Deleted');
}

// =============================================================================
// COMPETITIONS
// =============================================================================
export async function createCompetition(formData: FormData) {
  await ensureAdmin();
  const name = String(formData.get('name') || '').trim();
  const sortOrder = Number(formData.get('sort_order') || 0);
  if (!name) flashError('/admin/competitions', 'Name required');
  const admin = createAdminClient();
  const slug = slugify(name);
  const { error } = await admin.from('competitions').insert({ name, slug, sort_order: sortOrder });
  if (error) {
    revalidatePath('/admin/competitions');
    flashError('/admin/competitions', error.message);
  }
  revalidatePath('/admin/competitions');
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
  flashRedirect('/admin/competitions', 'Competition added');
}

export async function updateCompetition(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const name = String(formData.get('name') || '').trim();
  const sortOrder = Number(formData.get('sort_order') || 0);
  const admin = createAdminClient();
  const { error } = await admin
    .from('competitions')
    .update({ name, slug: slugify(name), sort_order: sortOrder })
    .eq('id', id);
  if (error) {
    revalidatePath('/admin/competitions');
    flashError('/admin/competitions', error.message);
  }
  revalidatePath('/admin/competitions');
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
  flashRedirect('/admin/competitions', 'Saved!');
}

export async function deleteCompetition(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const admin = createAdminClient();
  const { error } = await admin.from('competitions').delete().eq('id', id);
  if (error) {
    revalidatePath('/admin/competitions');
    flashError('/admin/competitions', error.message);
  }
  revalidatePath('/admin/competitions');
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
  flashRedirect('/admin/competitions', 'Deleted');
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
  if (!fullName) flashError('/admin/players', 'Name required');

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
    revalidatePath('/admin/players');
    flashError('/admin/players', error.message);
  }
  revalidatePath('/admin/players');
  revalidatePath('/players');
  flashRedirect('/admin/players', 'Player added');
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
  if (error) {
    revalidatePath('/admin/players');
    flashError('/admin/players', error.message);
  }
  revalidatePath('/admin/players');
  revalidatePath('/players');
  flashRedirect('/admin/players', 'Saved!');
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
  if (error) {
    revalidatePath('/admin/players');
    flashError('/admin/players', error.message);
  }
  if (existing?.photo_path) await removeFromBucket('players', existing.photo_path);
  revalidatePath('/admin/players');
  revalidatePath('/players');
  flashRedirect('/admin/players', 'Deleted');
}

// =============================================================================
// JERSEYS
// =============================================================================
async function uploadGallery(files: File[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    if (!f || f.size === 0) continue;
    out.push(await uploadToBucket('jerseys', f));
  }
  return out;
}

export async function createJersey(formData: FormData) {
  await ensureAdmin();
  const name = String(formData.get('name') || '').trim();
  const seasonId = String(formData.get('season_id') || '');
  const competitionId = String(formData.get('competition_id') || '') || null;
  const kitType = String(formData.get('kit_type') || 'home');
  const description = String(formData.get('description') || '').trim() || null;
  const releaseYear = formData.get('release_year') ? Number(formData.get('release_year')) : null;
  const playerIds = formData.getAll('player_ids').map(String).filter(Boolean);
  const images = formData.getAll('images').filter((v) => v instanceof File) as File[];

  if (!name || !seasonId || images.length === 0 || images[0].size === 0) {
    flashError('/admin/jerseys', 'Name, season, and at least one image required');
  }

  const galleryPaths = await uploadGallery(images);
  if (galleryPaths.length === 0) flashError('/admin/jerseys', 'No image uploaded');

  const admin = createAdminClient();
  const { data: jersey, error } = await admin
    .from('jerseys')
    .insert({
      name,
      season_id: seasonId,
      competition_id: competitionId,
      kit_type: kitType,
      description,
      release_year: releaseYear,
      sort_order: 0,
      image_path: galleryPaths[0],
    })
    .select('id')
    .single();

  if (error || !jersey) {
    for (const p of galleryPaths) await removeFromBucket('jerseys', p);
    revalidatePath('/admin/jerseys');
    flashError('/admin/jerseys', error?.message ?? 'Insert failed');
  }

  const galleryRows = galleryPaths.map((p, i) => ({
    jersey_id: jersey!.id,
    image_path: p,
    sort_order: i,
  }));
  if (galleryRows.length) await admin.from('jersey_images').insert(galleryRows);

  if (playerIds.length) {
    const rows = playerIds.map((pid) => ({ jersey_id: jersey!.id, player_id: pid }));
    await admin.from('jersey_players').insert(rows);
  }
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
  flashRedirect('/admin/jerseys', 'Jersey added');
}

export async function updateJersey(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const name = String(formData.get('name') || '').trim();
  const seasonId = String(formData.get('season_id') || '');
  const competitionId = String(formData.get('competition_id') || '') || null;
  const kitType = String(formData.get('kit_type') || 'home');
  const description = String(formData.get('description') || '').trim() || null;
  const releaseYear = formData.get('release_year') ? Number(formData.get('release_year')) : null;
  const playerIds = formData.getAll('player_ids').map(String).filter(Boolean);
  const newImages = formData.getAll('images').filter((v) => v instanceof File) as File[];
  const replaceCover = formData.get('replace_cover') === 'on';

  const admin = createAdminClient();
  const update: Record<string, unknown> = {
    name,
    season_id: seasonId,
    competition_id: competitionId,
    kit_type: kitType,
    description,
    release_year: releaseYear,
  };

  // Append any newly uploaded files to the gallery; optionally replace cover with first new file.
  const fresh = newImages.filter((f) => f && f.size > 0);
  if (fresh.length > 0) {
    const newPaths = await uploadGallery(fresh);
    // Determine current max sort_order
    const { data: existingImgs } = await admin
      .from('jersey_images')
      .select('sort_order')
      .eq('jersey_id', id)
      .order('sort_order', { ascending: false })
      .limit(1);
    const startOrder = (existingImgs?.[0]?.sort_order ?? -1) + 1;
    const galleryRows = newPaths.map((p, i) => ({
      jersey_id: id,
      image_path: p,
      sort_order: startOrder + i,
    }));
    await admin.from('jersey_images').insert(galleryRows);

    if (replaceCover) {
      // Promote the first new image. Leave the old cover file in storage so
      // the jersey_images row that backfilled to it (or any user-added row
      // pointing at it) keeps working — it just becomes a regular gallery shot.
      update.image_path = newPaths[0];
    }
  }

  const { error } = await admin.from('jerseys').update(update).eq('id', id);
  if (error) {
    revalidatePath('/admin/jerseys');
    flashError('/admin/jerseys', error.message);
  }

  await admin.from('jersey_players').delete().eq('jersey_id', id);
  if (playerIds.length) {
    const rows = playerIds.map((pid) => ({ jersey_id: id, player_id: pid }));
    await admin.from('jersey_players').insert(rows);
  }
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
  flashRedirect('/admin/jerseys', 'Saved!');
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
  const { data: gallery } = await admin
    .from('jersey_images')
    .select('image_path')
    .eq('jersey_id', id);
  const { error } = await admin.from('jerseys').delete().eq('id', id);
  if (error) {
    revalidatePath('/admin/jerseys');
    flashError('/admin/jerseys', error.message);
  }
  if (existing?.image_path) await removeFromBucket('jerseys', existing.image_path);
  for (const g of gallery ?? []) {
    if (g.image_path && g.image_path !== existing?.image_path) {
      await removeFromBucket('jerseys', g.image_path);
    }
  }
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
  flashRedirect('/admin/jerseys', 'Deleted');
}

export async function deleteJerseyImage(formData: FormData) {
  await ensureAdmin();
  const imageId = String(formData.get('image_id'));
  const admin = createAdminClient();
  const { data: img } = await admin
    .from('jersey_images')
    .select('image_path, jersey_id')
    .eq('id', imageId)
    .maybeSingle();
  if (!img) flashError('/admin/jerseys', 'Image not found');
  const { error } = await admin.from('jersey_images').delete().eq('id', imageId);
  if (error) {
    revalidatePath('/admin/jerseys');
    flashError('/admin/jerseys', error.message);
  }
  await removeFromBucket('jerseys', img!.image_path);
  // If this path was the jersey cover, promote next image
  const { data: jersey } = await admin
    .from('jerseys')
    .select('image_path')
    .eq('id', img!.jersey_id)
    .maybeSingle();
  if (jersey?.image_path === img!.image_path) {
    const { data: next } = await admin
      .from('jersey_images')
      .select('image_path')
      .eq('jersey_id', img!.jersey_id)
      .order('sort_order', { ascending: true })
      .limit(1);
    await admin
      .from('jerseys')
      .update({ image_path: next?.[0]?.image_path ?? null })
      .eq('id', img!.jersey_id);
  }
  revalidatePath('/admin/jerseys');
  revalidatePath('/jerseys');
  flashRedirect('/admin/jerseys', 'Image removed');
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
  if (!image || image.size === 0) flashError('/admin/banners', 'Image required');

  const path = await uploadToBucket('banners', image!);
  const admin = createAdminClient();
  const { error } = await admin
    .from('banners')
    .insert({ image_path: path, caption, sort_order: sortOrder, active });
  if (error) {
    await removeFromBucket('banners', path);
    revalidatePath('/admin/banners');
    flashError('/admin/banners', error.message);
  }
  revalidatePath('/admin/banners');
  revalidatePath('/login');
  flashRedirect('/admin/banners', 'Banner added');
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
  if (error) {
    revalidatePath('/admin/banners');
    flashError('/admin/banners', error.message);
  }
  revalidatePath('/admin/banners');
  revalidatePath('/login');
  flashRedirect('/admin/banners', 'Saved!');
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
  if (error) {
    revalidatePath('/admin/banners');
    flashError('/admin/banners', error.message);
  }
  if (existing?.image_path) await removeFromBucket('banners', existing.image_path);
  revalidatePath('/admin/banners');
  revalidatePath('/login');
  flashRedirect('/admin/banners', 'Deleted');
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
  flashRedirect('/admin/banners', 'Saved!');
}

// =============================================================================
// USERS
// =============================================================================
export async function inviteUser(formData: FormData) {
  let resultParam = '';
  try {
    await ensureAdmin();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const makeAdmin = formData.get('role') === 'admin';
    if (!email) throw new Error('Email required');

    const admin = createAdminClient();
    const origin = currentOrigin();
    const redirectTo = origin
      ? `${origin}/auth/callback?next=/auth/set-password`
      : undefined;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) throw new Error(error.message);

    if (makeAdmin && data?.user) {
      const { error: roleErr } = await admin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', data.user.id);
      if (roleErr) throw new Error(`Invite sent, but role promotion failed: ${roleErr.message}`);
    }
    resultParam = `invited=${encodeURIComponent(email)}&saved=${encodeURIComponent('Invite sent')}`;
  } catch (e) {
    const msg = (e as Error).message ?? 'unknown error';
    console.error('[inviteUser] failed', e);
    resultParam = `error=${encodeURIComponent(msg)}`;
  }
  revalidatePath('/admin/users');
  redirect(`/admin/users?${resultParam}`);
}

export async function setUserRole(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const role = String(formData.get('role')) === 'admin' ? 'admin' : 'user';
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ role }).eq('id', id);
  if (error) {
    revalidatePath('/admin/users');
    flashError('/admin/users', error.message);
  }
  revalidatePath('/admin/users');
  flashRedirect('/admin/users', 'Role updated');
}

export async function deleteUser(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get('id'));
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    revalidatePath('/admin/users');
    flashError('/admin/users', error.message);
  }
  revalidatePath('/admin/users');
  flashRedirect('/admin/users', 'User deleted');
}
