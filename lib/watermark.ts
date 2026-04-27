import sharp from 'sharp';
import crypto from 'node:crypto';

const SECRET = process.env.WATERMARK_SECRET || 'bayernshoufu-dev-secret-change-me';

/**
 * Derive a short HMAC token from a user ID.
 * Token survives screenshots via tiled overlay and direct file leaks via LSB.
 */
export function userToken(userId: string): string {
  return crypto.createHmac('sha256', SECRET).update(userId).digest('hex').slice(0, 16);
}

/**
 * Reverse-lookup helper for forensics: try a userId against a token.
 */
export function verifyToken(userId: string, token: string): boolean {
  return userToken(userId) === token;
}

function tokenToBits(token: string): number[] {
  const bits: number[] = [];
  for (const c of token) {
    const n = parseInt(c, 16);
    for (let i = 3; i >= 0; i--) bits.push((n >> i) & 1);
  }
  return bits;
}

function bitsToToken(bits: number[]): string {
  let out = '';
  for (let i = 0; i < bits.length; i += 4) {
    const n = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    out += n.toString(16);
  }
  return out;
}

function embedLSB(rgba: Buffer, channels: number, token: string): void {
  const bits = tokenToBits(token);
  for (let i = 0; i < bits.length; i++) {
    const idx = i * channels;
    if (idx >= rgba.length) break;
    rgba[idx] = (rgba[idx] & 0xfe) | bits[i];
  }
}

export function extractLSB(rgba: Buffer, channels: number, length = 16): string {
  const totalBits = length * 4;
  const bits: number[] = [];
  for (let i = 0; i < totalBits; i++) {
    bits.push(rgba[i * channels] & 1);
  }
  return bitsToToken(bits);
}

function tileSvg(width: number, height: number, token: string, opacity = 0.045): string {
  const tileW = 260;
  const tileH = 220;
  const fontSize = 11;
  const tiles: string[] = [];
  for (let y = -tileH; y < height + tileH; y += tileH) {
    for (let x = -tileW; x < width + tileW; x += tileW) {
      tiles.push(
        `<text x="${x}" y="${y}" fill="#ffffff" fill-opacity="${opacity}" font-size="${fontSize}" font-family="monospace" transform="rotate(-30 ${x} ${y})">BAYERNSHOUFU · ${token}</text>`
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${tiles.join('')}</svg>`;
}

/**
 * Apply a per-user watermark: tiled subtle text overlay + LSB embed.
 * Output: PNG buffer.
 */
export async function watermarkForUser(input: Buffer, userId: string): Promise<Buffer> {
  const token = userToken(userId);
  const base = sharp(input, { failOn: 'none' }).rotate();
  const meta = await base.metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  const overlaid = await base
    .composite([{ input: Buffer.from(tileSvg(width, height, token)), blend: 'over' }])
    .toBuffer();

  // Force RGBA so LSB has stable channel count
  const { data, info } = await sharp(overlaid)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  embedLSB(data, info.channels, token);

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png({ compressionLevel: 8 })
    .toBuffer();
}

/**
 * Lighter watermark for banners (pre-auth public images).
 */
export async function watermarkGeneric(input: Buffer): Promise<Buffer> {
  const base = sharp(input, { failOn: 'none' }).rotate();
  const meta = await base.metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;
  return base
    .composite([{ input: Buffer.from(tileSvg(width, height, 'BAYERNSHOUFU', 0.025)), blend: 'over' }])
    .png({ compressionLevel: 8 })
    .toBuffer();
}
