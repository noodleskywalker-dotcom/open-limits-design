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

/** Wait until phase engine reaches target (wall-clock sync). */
const SHOTS = [
  { name: "01-idea-0.6s", waitPhase: "idea", minMs: 500 },
  { name: "02-blueprint-1.8s", waitPhase: "blueprint", minMs: 1500 },
  { name: "03-structure-3.8s", waitPhase: "structure", minMs: 3300 },
  { name: "04-materials-5.8s", waitPhase: "materials", minMs: 5300 },
  { name: "05-interior-8.0s", waitPhase: "walkthrough", minMs: 7300 },
  { name: "06-exterior-10.5s", waitPhase: "exterior", minMs: 9800 },
  { name: "07-brand-13.0s", waitPhase: "brand", minMs: 12700 },
  { name: "08-enter-14.5s", waitPhase: "enter", minMs: 14200 }
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } }
  });
  await context.addInitScript(() => {
    localStorage.removeItem("ol-cinematic-film-dismissed");
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" });

  const t0 = Date.now();
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".ol-film-root[data-phase]", { timeout: 30000 });

  const audit = [];

  for (const shot of SHOTS) {
    await page.waitForFunction(
      (phase) => document.querySelector(".ol-film-root")?.getAttribute("data-phase") === phase,
      shot.waitPhase,
      { timeout: 20000 }
    );
    const elapsed = Date.now() - t0;
    if (elapsed < shot.minMs) {
      await page.waitForTimeout(shot.minMs - elapsed);
    }
    /* Let in-phase animation settle */
    await page.waitForTimeout(shot.waitPhase === "walkthrough" ? 900 : shot.waitPhase === "exterior" ? 1400 : shot.waitPhase === "brand" ? 900 : 350);

    const snap = await page.evaluate(() => {
      const rect = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      };
      return {
        phase: document.querySelector(".ol-film-root")?.getAttribute("data-phase"),
        stage: rect(".ol-film-stage"),
        paths: document.querySelectorAll(".ol-film-stroke, .ol-film-stroke-idea").length
      };
    });

    audit.push({ shot: shot.name, targetPhase: shot.waitPhase, ...snap });
    await page.screenshot({ path: path.join(OUT, `${shot.name}.png`) });
  }

  await page.waitForTimeout(1200);
  await context.close();
  await browser.close();

  const videoFiles = fs.readdirSync(OUT).filter((f) => f.endsWith(".webm") && f !== "full-animation.webm");
  if (videoFiles.length) {
    const latest = videoFiles.sort().pop();
    fs.copyFileSync(path.join(OUT, latest), path.join(OUT, "full-animation.webm"));
  }

  try {
    const { execSync } = await import("node:child_process");
    execSync(
      `ffmpeg -y -i "${path.join(OUT, "full-animation.webm")}" -vf "fps=12,scale=640:-1" "${path.join(OUT, "full-animation.gif")}"`,
      { stdio: "ignore" }
    );
  } catch {
    /* optional */
  }

  fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify(audit, null, 2));
  console.log(JSON.stringify({ out: OUT, audit }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
