import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { watermarkForUser, watermarkGeneric } from '@/lib/watermark';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Bucket = 'jerseys' | 'players' | 'banners' | 'jersey-images';

const BUCKETS: Record<
  Bucket,
  {
    table: string;
    pathColumn: string;
    storage: 'jerseys' | 'players' | 'banners';
  }
> = {
  jerseys: {
    table: 'jerseys',
    pathColumn: 'image_path',
    storage: 'jerseys',
  },
  players: {
    table: 'players',
    pathColumn: 'photo_path',
    storage: 'players',
  },
  banners: {
    table: 'banners',
    pathColumn: 'image_path',
    storage: 'banners',
  },
  'jersey-images': {
    table: 'jersey_images',
    pathColumn: 'image_path',
    storage: 'jerseys',
  },
};

function detectMime(buf: Buffer): string {
  if (buf.length < 12) return 'application/octet-stream';

  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'image/png';
  }

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return 'image/gif';
  }

  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }

  return 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { bucket: string; id: string } }
) {
  const bucket = params.bucket as Bucket;

  if (!(bucket in BUCKETS)) {
    return NextResponse.json(
      { error: 'unknown bucket' },
      { status: 404 }
    );
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = BUCKETS[bucket];
  const admin = createAdminClient();

  // 1. Get image path from database
  const { data: row, error: rowErr } = await admin
    .from(meta.table)
    .select(meta.pathColumn)
    .eq('id', params.id)
    .maybeSingle();

  if (rowErr) {
    console.error('[image] db error', {
      bucket,
      id: params.id,
      rowErr,
    });

    return NextResponse.json(
      {
        error: 'db error',
        detail: rowErr.message,
      },
      { status: 500 }
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: 'not found' },
      { status: 404 }
    );
  }

  const path = (
    row as unknown as Record<string, string | null>
  )[meta.pathColumn];

  if (!path) {
    return NextResponse.json(
      { error: 'no image path' },
      { status: 404 }
    );
  }

  // 2. Download original image from Supabase Storage
  const { data: blob, error: dlErr } = await admin.storage
    .from(meta.storage)
    .download(path);

  if (dlErr || !blob) {
    console.error('[image] storage download failed', {
      bucket,
      path,
      dlErr,
    });

    return NextResponse.json(
      {
        error: 'download failed',
        detail: dlErr?.message,
      },
      { status: 500 }
    );
  }

  const inputBuf = Buffer.from(await blob.arrayBuffer());
  const inputMime = detectMime(inputBuf);

  let outBuf: Buffer = inputBuf;
  let outMime = inputMime;

  try {
    // --------------------------------------------------
    // PLAYER PHOTOS
    // --------------------------------------------------
    if (bucket === 'players') {
      outBuf = await sharp(inputBuf, {
        failOn: 'none',
      })
        .rotate()
        .resize({
          width: 500,
          height: 500,
          fit: 'cover',
          withoutEnlargement: true,
        })
        .webp({
          quality: 72,
          effort: 4,
        })
        .toBuffer();

      outMime = 'image/webp';
    }

    // --------------------------------------------------
    // JERSEYS / EXTRA JERSEY IMAGES / BANNERS
    // --------------------------------------------------
    else {
      // Limit extremely large originals before watermarking.
      // This reduces memory usage and processing time.
      const normalized = await sharp(inputBuf, {
        failOn: 'none',
      })
        .rotate()
        .resize({
          width: 1800,
          height: 1800,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();

      // Keep existing watermark behavior.
      const watermarked = user
        ? await watermarkForUser(normalized, user.id)
        : await watermarkGeneric(normalized);

      // Convert final result to WebP instead of PNG.
      // This dramatically reduces photo file size.
      outBuf = await sharp(watermarked, {
        failOn: 'none',
      })
        .webp({
          quality: 78,
          effort: 4,
        })
        .toBuffer();

      outMime = 'image/webp';
    }
  } catch (e) {
    console.error('[image] processing failed, returning original', {
      bucket,
      id: params.id,
      path,
      inputMime,
      err: (e as Error).message,
    });

    // If Sharp/watermark processing fails,
    // return original image rather than breaking the page.
    outBuf = inputBuf;
    outMime = inputMime;
  }

  // 3. Access log
  // Do not block image response waiting for logging.
  void admin
    .from('image_access_logs')
    .insert({
      user_id: user?.id ?? null,
      kind:
        bucket === 'jersey-images'
          ? 'jersey'
          : bucket.replace(/s$/, ''),
      entity_id: params.id,
      ip:
        request.headers
          .get('x-forwarded-for')
          ?.split(',')[0]
          ?.trim() ?? null,
      user_agent: request.headers.get('user-agent') ?? null,
    })
    .then(() => undefined);

  // --------------------------------------------------
  // CACHE STRATEGY
  // --------------------------------------------------

  /*
    PLAYER PHOTOS:
    Same image for everyone.
    Safe for Vercel/CDN public caching.

    JERSEYS:
    Logged-in users receive user-specific watermarks,
    so they MUST remain private.

    Logged-out users all receive the same generic watermark,
    so those can use shared CDN caching.
  */

  let cacheControl: string;

  if (bucket === 'players') {
    cacheControl =
      'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000';
  } else if (!user) {
    cacheControl =
      'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000';
  } else {
    cacheControl = 'private, max-age=86400';
  }

  return new NextResponse(new Uint8Array(outBuf), {
    status: 200,
    headers: {
      'Content-Type': outMime,
      'Cache-Control': cacheControl,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
