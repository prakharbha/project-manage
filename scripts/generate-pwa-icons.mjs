/**
 * Generates PWA icons from public/football.png
 * Navy background (#2e3845) with white football centred inside.
 *
 * Run: node scripts/generate-pwa-icons.mjs
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const footballPath = path.join(publicDir, 'football.png');

async function generateIcon(size, filename, ballFraction = 0.72) {
    const ballSize = Math.round(size * ballFraction);
    const offset   = Math.round((size - ballSize) / 2);

    // Resize football keeping original black colour, pad transparent edges
    const ball = await sharp(footballPath)
        .resize(ballSize, ballSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();

    // Step 1: pre-flatten the ball onto white so the output has no alpha channel
    const flatBall = await sharp(ball)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .removeAlpha()
        .png()
        .toBuffer();

    // Step 2: extend with white padding to reach the target icon size
    await sharp(flatBall)
        .extend({
            top: offset,
            bottom: size - ballSize - offset,
            left: offset,
            right:  size - ballSize - offset,
            background: { r: 255, g: 255, b: 255 }
        })
        .removeAlpha()
        .png()
        .toFile(path.join(publicDir, filename));

    console.log(`✓  ${filename}  (${size}×${size})`);
}

async function main() {
    await generateIcon(512, 'icon-512.png');
    await generateIcon(192, 'icon-192.png');
    await generateIcon(180, 'apple-touch-icon.png');
    console.log('\nAll PWA icons generated in /public/');
}

main().catch(err => { console.error(err); process.exit(1); });
