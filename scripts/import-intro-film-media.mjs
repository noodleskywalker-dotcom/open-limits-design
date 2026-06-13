#!/usr/bin/env node
/**
 * Import client film media from openlimitsdesign.com WordPress uploads.
 * Usage: node scripts/import-intro-film-media.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const OUT = path.join(process.cwd(), "public", "intro-film");
const TMP = path.join(process.cwd(), ".tmp-intro-film");

const INTERIOR_MP4 =
  "https://openlimitsdesign.com/wp-content/uploads/2026/01/3.5.mp4";
const INTERIOR_POSTER_SRC = path.join(
  process.cwd(),
  "public/images/legacy/hero-luxury-interior-02.jpeg"
);

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${url}: ${res.status}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });

  if (!fs.existsSync(INTERIOR_POSTER_SRC)) {
    throw new Error(`Missing ${INTERIOR_POSTER_SRC}`);
  }

  fs.copyFileSync(INTERIOR_POSTER_SRC, path.join(OUT, "poster-interior.jpg"));
  console.log("✓ poster-interior.jpg");

  const mp4 = path.join(TMP, "interior-source.mp4");
  await download(INTERIOR_MP4, mp4);
  execSync(
    `ffmpeg -y -i "${mp4}" -c:v libvpx-vp9 -crf 32 -b:v 0 -an "${path.join(OUT, "interior-walkthrough.webm")}"`,
    { stdio: "inherit" }
  );
  console.log("✓ interior-walkthrough.webm");

  console.log("\nExterior assets NOT imported — see public/intro-film/MEDIA-GAP.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
