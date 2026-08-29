#!/usr/bin/env node
/**
 * Build the reversed ("knockout") Readers' Summit logo for dark backgrounds.
 *
 *     node scripts/make-reverse-logo.mjs
 *
 * The supplied logo is already transparent — the beige on the LED screens was
 * never in the file, it was a cream plaque behind it in ScreenShell. That
 * plaque existed for a real reason: the logo's primary ink is navy #081878,
 * and navy ink on a navy wall is invisible. Removing the card alone would
 * have deleted half the logo.
 *
 * So this recolours instead. The mark has exactly two ink families, which is
 * what makes an automatic knockout safe here:
 *
 *   navy  #081878 / #081868   "Pick a Book", "READERS'", "2026", the swirl
 *   gold  #d89828 family      "SUMMIT" and the rules
 *
 * Navy is remapped into a cream range, gold is left alone (it already reads
 * on navy). Alpha is untouched, so the edges stay anti-aliased.
 *
 * Committed rather than run once by hand: if the brand sends a new logo, the
 * dark-background version has to be regenerated the same way, and nobody
 * should have to reverse-engineer these thresholds to do it.
 */

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "public", "summit-logo.webp");
const OUT = path.join(root, "public", "summit-logo-reverse.webp");

/** Darkest and lightest cream the navy is mapped onto. */
const CREAM_DARK = [0xef, 0xe6, 0xd6];
const CREAM_LIGHT = [0xff, 0xff, 0xff];

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

let navy = 0;
let gold = 0;

for (let i = 0; i < info.width * info.height; i++) {
  const o = i * 4;
  const r = data[o];
  const g = data[o + 1];
  const b = data[o + 2];
  const a = data[o + 3];

  if (a === 0) continue;

  // Gold is red-dominant, navy is blue-dominant. Nothing in this mark is
  // neutral enough for the test to be ambiguous.
  if (r > b + 30) {
    gold++;
    continue;
  }

  navy++;

  // Preserve the ink's own light-to-dark variation rather than flooding it
  // flat: the swirl through the "B" of Book is a lighter blue than the
  // lettering, and a flat fill would dissolve it into the letterform.
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const t = Math.min(1, lum / 0.5);

  data[o] = Math.round(CREAM_DARK[0] + (CREAM_LIGHT[0] - CREAM_DARK[0]) * t);
  data[o + 1] = Math.round(CREAM_DARK[1] + (CREAM_LIGHT[1] - CREAM_DARK[1]) * t);
  data[o + 2] = Math.round(CREAM_DARK[2] + (CREAM_LIGHT[2] - CREAM_DARK[2]) * t);
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ quality: 92 })
  .toFile(OUT);

console.log(`wrote ${path.relative(root, OUT)}  (${navy} navy px recoloured, ${gold} gold px kept)`);
