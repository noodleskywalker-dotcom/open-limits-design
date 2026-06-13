#!/usr/bin/env node
/**
 * Capture screenshots + video for /prototype/open-limits-client-film (creation-first intro)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3001";
const ROUTE = "/prototype/open-limits-client-film";
const OUT = path.join(process.cwd(), "artifacts", "prototype-visuals", "open-limits-client-film");

const SHOTS = [
  { name: "01-pencil", waitPhase: "pencil", minMs: 800 },
  { name: "02-blueprint", waitPhase: "blueprint", minMs: 5200 },
  { name: "03-transform", waitPhase: "transform", minMs: 10800, holdMs: 1400 },
  { name: "04-villa", waitPhase: "villa", minMs: 14200, holdMs: 800 },
  { name: "05-brand", waitPhase: "brand", minMs: 0, holdMs: 900 },
  { name: "06-enter", waitPhase: "enter", minMs: 20800, holdMs: 500 }
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } }
  });
  await context.addInitScript(() => {
    localStorage.removeItem("ol-creation-intro-dismissed");
    localStorage.removeItem("ol-client-film-dismissed");
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (String(query).includes("prefers-reduced-motion")) {
        return {
          matches: false,
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false
        };
      }
      return nativeMatchMedia(query);
    };
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" });

  const errors = [];
  const mediaRequests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (req) => {
    const url = req.url();
    if (/intro-film/i.test(url)) {
      mediaRequests.push(url);
    }
  });

  await page.goto(`${BASE}${ROUTE}?debug=1`, { waitUntil: "load" });
  await page.waitForSelector(".olcrt-root[data-phase]", { timeout: 30000 });

  const t0 = Date.now();
  const audit = [];

  for (const shot of SHOTS) {
    await page.waitForFunction(
      (phase) => document.querySelector(".olcrt-root")?.getAttribute("data-phase") === phase,
      shot.waitPhase,
      { timeout: 30000 }
    );
    const elapsed = Date.now() - t0;
    if (shot.minMs > 0 && elapsed < shot.minMs) {
      await page.waitForTimeout(shot.minMs - elapsed);
    }
    await page.waitForTimeout(shot.holdMs ?? (shot.waitPhase === "transform" ? 900 : shot.waitPhase === "brand" ? 700 : 450));

    const snap = await page.evaluate(() => {
      const rect = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      };
      const root = document.querySelector(".olcrt-root");
      return {
        phase: root?.getAttribute("data-phase"),
        stage: rect(".olcrt-stage"),
        hasCanvas: !!document.querySelector(".olcrt-canvas-wrap canvas"),
        hasBlueprint: !!document.querySelector(".olcrt-svg-plan"),
        hasIntroMedia: !!root?.querySelector("img, video")
      };
    });

    audit.push({ shot: shot.name, ...snap, consoleErrors: errors.length });
    await page.screenshot({ path: path.join(OUT, `${shot.name}.png`) });
  }

  await page.waitForTimeout(800);
  await context.close();
  await browser.close();

  const videoFiles = fs.readdirSync(OUT).filter((f) => f.endsWith(".webm") && f !== "full-animation.webm");
  if (videoFiles.length) {
    const latest = videoFiles.sort().pop();
    if (latest) {
      fs.copyFileSync(path.join(OUT, latest), path.join(OUT, "full-animation.webm"));
    }
  }

  try {
    const { execSync } = await import("node:child_process");
    execSync(
      `ffmpeg -y -i "${path.join(OUT, "full-animation.webm")}" -vf "fps=12,scale=640:-1" "${path.join(OUT, "full-animation.gif")}"`,
      { stdio: "ignore" }
    );
    execSync(
      `ffmpeg -y -i "${path.join(OUT, "full-animation.webm")}" -c:v libx264 -pix_fmt yuv420p "${path.join(OUT, "full-animation.mp4")}"`,
      { stdio: "ignore" }
    );
  } catch {
    /* optional */
  }

  const verification = {
    route: ROUTE,
    architecture: "creation-first",
    zeroMediaRequests: mediaRequests.length === 0,
    mediaRequests,
    zeroMediaDom: audit.every((a) => !a.hasIntroMedia),
    phasesCaptured: audit.map((a) => a.phase)
  };

  fs.writeFileSync(path.join(OUT, "verification.json"), JSON.stringify(verification, null, 2));
  fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify({ audit, errors, verification }, null, 2));
  console.log(JSON.stringify({ out: OUT, verification, audit, errors }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
