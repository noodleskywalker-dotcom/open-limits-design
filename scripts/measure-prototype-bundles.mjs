#!/usr/bin/env node
/**
 * Measure prototype route bundle footprints after `npm run build`.
 * Writes lib/prototype/bundle-measurements.json
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "lib/prototype/bundle-measurements.json");

function dirSizeBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

const routes = {
  cinematic: {
    server: path.join(ROOT, ".next/server/app/prototype/current-cinematic"),
    static: path.join(ROOT, ".next/static/chunks")
  },
  signature: {
    server: path.join(ROOT, ".next/server/app/prototype/signature-open-limits"),
    static: path.join(ROOT, ".next/static/chunks")
  },
  comparison: {
    server: path.join(ROOT, ".next/server/app/prototype-comparison")
  },
  framerMotion: path.join(ROOT, "node_modules/framer-motion/dist")
};

const cinematicServer = dirSizeBytes(routes.cinematic.server);
const signatureServer = dirSizeBytes(routes.signature.server);
const comparisonServer = dirSizeBytes(routes.comparison.server);
const framerKb = kb(dirSizeBytes(routes.framerMotion));

/** Shared chunks — rough whole-chunks dir; not route-isolated without analyzer */
const allChunksKb = kb(dirSizeBytes(routes.cinematic.static));

const result = {
  measuredAt: new Date().toISOString(),
  note: "Server route dir sizes are approximate; shared client chunks are not route-split precisely without @next/bundle-analyzer.",
  cinematic: {
    serverRouteKb: kb(cinematicServer),
    sharedStaticChunksDirKb: allChunksKb
  },
  signature: {
    serverRouteKb: kb(signatureServer),
    sharedStaticChunksDirKb: allChunksKb
  },
  comparison: {
    serverRouteKb: kb(comparisonServer)
  },
  framerMotionDistKb: framerKb
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
