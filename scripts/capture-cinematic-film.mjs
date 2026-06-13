#!/usr/bin/env node
/**
 * Capture screenshots + video for /prototype/open-limits-cinematic-film
 * Usage: node scripts/capture-cinematic-film.mjs [baseUrl]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3001";
const ROUTE = "/prototype/open-limits-cinematic-film";
const OUT = path.join(process.cwd(), "artifacts", "prototype-visuals", "open-limits-cinematic-film");

const SHOTS = [
  { name: "01-idea-0.8s", ms: 800 },
  { name: "02-blueprint-2.5s", ms: 2500 },
  { name: "03-structure-4.5s", ms: 4500 },
  { name: "04-materials-6.5s", ms: 6500 },
  { name: "05-interior-8.5s", ms: 8500 },
  { name: "06-exterior-10.2s", ms: 10200 },
  { name: "07-brand-11.5s", ms: 11500 },
  { name: "08-enter-12.5s", ms: 12500 }
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } }
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" });

  await page.goto(`${BASE}${ROUTE}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ol-film-root", { timeout: 20000 });

  let elapsed = 0;
  const audit = [];

  for (const shot of SHOTS) {
    const delta = shot.ms - elapsed;
    if (delta > 0) await page.waitForTimeout(delta);
    elapsed = shot.ms;

    const snap = await page.evaluate(() => {
      const cs = (el) => (el ? getComputedStyle(el) : null);
      const rect = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      };
      return {
        phase: document.querySelector(".ol-film-root")?.getAttribute("data-phase"),
        stage: rect(".ol-film-stage"),
        stageOpacity: cs(document.querySelector(".ol-film-stage-outer"))?.opacity ?? "missing",
        paths: document.querySelectorAll(".ol-film-stroke, .ol-film-stroke-idea").length,
        blackRatio: (() => {
          const stage = document.querySelector(".ol-film-stage");
          if (!stage) return "no-stage";
          const r = stage.getBoundingClientRect();
          return r.width > 100 && r.height > 100 ? "ok" : "collapsed";
        })()
      };
    });

    audit.push({ shot: shot.name, ms: shot.ms, ...snap });
    await page.screenshot({ path: path.join(OUT, `${shot.name}.png`) });
  }

  await page.waitForTimeout(1500);
  await context.close();
  await browser.close();

  const videoFiles = fs.readdirSync(OUT).filter((f) => f.endsWith(".webm"));
  if (videoFiles[0]) {
    fs.renameSync(path.join(OUT, videoFiles[0]), path.join(OUT, "full-animation.webm"));
  }

  fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify(audit, null, 2));
  console.log(JSON.stringify({ out: OUT, audit }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
