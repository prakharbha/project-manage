/**
 * Generates PWA icons and favicon from public/football.png
 * Navy background (#2e3845) with the football centred inside.
 *
 * Run: node scripts/generate-pwa-icons.mjs
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const footballPath = path.join(publicDir, 'football.png');

// Brand navy colour
const NAVY = { r: 46, g: 56, b: 69, alpha: 255 };

async function generateIcon(size, filename, ballFraction = 0.72) {
    const ballSize = Math.round(size * ballFraction);
    const offset   = Math.round((size - ballSize) / 2);

    // Resize the football preserving its transparent background
    const ball = await sharp(footballPath)
        .resize(ballSize, ballSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

    // Composite the transparent football onto a solid navy canvas
    await sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: NAVY,
        },
    })
        .composite([{ input: ball, top: offset, left: offset }])
        .removeAlpha()
        .png()
        .toFile(path.join(publicDir, filename));

    console.log(`✓  ${filename}  (${size}×${size})`);
}

async function main() {
    await generateIcon(512, 'icon-512.png');
    await generateIcon(192, 'icon-192.png');
    await generateIcon(180, 'apple-touch-icon.png');
    // Favicon sizes
    await generateIcon(32, 'favicon-32x32.png', 0.78);
    await generateIcon(16, 'favicon-16x16.png', 0.78);
    console.log('\nAll PWA icons and favicons generated in /public/');
}

main().catch(err => { console.error(err); process.exit(1); });
