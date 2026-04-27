/**
 * Forensic watermark decoder.
 *
 * Usage:
 *   npm run watermark:decode -- <image.png> [--users-csv users.csv]
 *
 * Without --users-csv, prints the LSB token only.
 * With --users-csv (id,email per line), tries to match the token against each user.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { extractLSB, userToken } from '../lib/watermark';

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error('Usage: watermark:decode <image> [--users-csv path]');
    process.exit(1);
  }
  const imgPath = path.resolve(args[0]);
  const csvFlag = args.indexOf('--users-csv');
  const csvPath = csvFlag >= 0 ? path.resolve(args[csvFlag + 1]) : null;

  const buf = await fs.promises.readFile(imgPath);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const token = extractLSB(data, info.channels);

  console.log('Extracted LSB token:', token);

  if (csvPath) {
    const csv = await fs.promises.readFile(csvPath, 'utf8');
    const lines = csv.trim().split('\n');
    const matches: { id: string; email: string }[] = [];
    for (const line of lines) {
      const [id, email] = line.split(',').map((s) => s.trim());
      if (!id) continue;
      if (userToken(id) === token) matches.push({ id, email: email ?? '' });
    }
    if (matches.length === 0) console.log('No user match. Token may be corrupted (recompression / screenshot).');
    else for (const m of matches) console.log('Match:', m.id, m.email);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
