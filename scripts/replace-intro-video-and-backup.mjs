#!/usr/bin/env node
/**
 * Replace placeholder intro video with real master, verify, and recreate backup.
 * Usage: node scripts/replace-intro-video-and-backup.mjs [source.mp4]
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const PLACEHOLDER_MD5 = "6a89520a15d4578a73c7fc14f92d72f2";
const PLACEHOLDER_SIZE = 489668;
const OUT = path.join(process.cwd(), "public/intro-video/open-limits-intro.mp4");
const BACKUP_ZIP = path.join(process.cwd(), "open-limits-design-full-backup.zip");

const candidates = [
  process.argv[2],
  path.join(process.cwd(), "open-limits-intro.mp4.mp4"),
  path.join(process.cwd(), "open-limits-intro.mp4"),
  path.join(process.cwd(), "open-limits-intro.mp4.zip")
].filter(Boolean);

function hashFile(filePath) {
  return createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
}

function extractMp4FromZip(zipPath, tmpDir) {
  execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: "inherit" });
  const mp4s = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name.toLowerCase().endsWith(".mp4")) mp4s.push(full);
    }
  };
  walk(tmpDir);
  return mp4s.find((p) => path.basename(p).toLowerCase().includes("open-limits")) ?? mp4s[0];
}

let source = candidates.find((p) => fs.existsSync(p));
if (!source) {
  console.error("Real intro video not found. Tried:\n  " + candidates.join("\n  "));
  console.error("\nUpload your file to the workspace root, then rerun this script.");
  process.exit(1);
}

let srcMp4 = source;
let tmpDir = null;
if (source.toLowerCase().endsWith(".zip")) {
  tmpDir = fs.mkdtempSync(path.join("/tmp", "ol-intro-src-"));
  srcMp4 = extractMp4FromZip(source, tmpDir);
  if (!srcMp4) {
    console.error("No .mp4 found inside ZIP");
    process.exit(1);
  }
}

const size = fs.statSync(srcMp4).size;
const md5 = hashFile(srcMp4);
if (size === PLACEHOLDER_SIZE && md5 === PLACEHOLDER_MD5) {
  console.error("Source is still the bundled placeholder — upload your real master first.");
  process.exit(1);
}

fs.copyFileSync(srcMp4, OUT);
if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });

const outSize = fs.statSync(OUT).size;
const outMd5 = hashFile(OUT);
const probe = JSON.parse(
  execSync(
    `ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of json "${OUT}"`,
    { encoding: "utf8" }
  )
);

console.log("=== Intro video replaced ===");
console.log(JSON.stringify({ source, output: OUT, sizeBytes: outSize, md5: outMd5, ffprobe: probe }, null, 2));

console.log("\n=== Recreating backup ZIP ===");
if (fs.existsSync(BACKUP_ZIP)) fs.unlinkSync(BACKUP_ZIP);
execSync(
  `zip -r "${BACKUP_ZIP}" . -x "node_modules/*" -x "node_modules/**/*" -x ".next/*" -x ".next/**/*" -x "out/*" -x "out/**/*" -x "open-limits-design-full-backup.zip"`,
  { stdio: "inherit", cwd: process.cwd() }
);
execSync(`unzip -t "${BACKUP_ZIP}"`, { stdio: "inherit" });
const zipSize = fs.statSync(BACKUP_ZIP).size;
console.log(`\nBackup ready: ${BACKUP_ZIP} (${zipSize} bytes)`);
