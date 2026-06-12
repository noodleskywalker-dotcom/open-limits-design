#!/usr/bin/env node
/**
 * Download official images from https://openlimitsdesign.com/ into public/images/legacy/.
 *
 * Usage:
 *   node scripts/download-legacy-images.mjs
 *   npm run legacy:download-images
 */
import fs from "node:fs";
import path from "node:path";
import { LEGACY_IMAGE_MANIFEST, SOURCE_SITE } from "../lib/cms/legacy-manifest.mjs";

const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "legacy");

async function downloadFile(sourceUrl, destPath) {
  const response = await fetch(sourceUrl, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return buffer.length;
}

console.log(`Downloading ${LEGACY_IMAGE_MANIFEST.length} images from ${SOURCE_SITE}\n`);
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let downloaded = 0;
let skipped = 0;
const errors = [];

for (const item of LEGACY_IMAGE_MANIFEST) {
  const destPath = path.join(OUTPUT_DIR, item.fileName);
  if (fs.existsSync(destPath)) {
    skipped += 1;
    console.log(`  skip  ${item.fileName}`);
    continue;
  }

  try {
    const bytes = await downloadFile(item.sourceUrl, destPath);
    downloaded += 1;
    console.log(`  ok    ${item.fileName} (${bytes} bytes)`);
  } catch (error) {
    errors.push({ fileName: item.fileName, error: error instanceof Error ? error.message : String(error) });
    console.error(`  fail  ${item.fileName}: ${errors.at(-1).error}`);
  }
}

console.log(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${errors.length} failed`);
console.log(`Output: ${OUTPUT_DIR}`);

if (errors.length) process.exit(1);
