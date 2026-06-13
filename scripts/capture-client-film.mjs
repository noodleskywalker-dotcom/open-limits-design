#!/usr/bin/env node
/**
 * Capture screenshots + video for /prototype/open-limits-client-film
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3001";
const ROUTE = "/prototype/open-limits-client-film";
const OUT = path.join(process.cwd(), "artifacts", "prototype-visuals", "open-limits-client-film");

const SHOTS = [
  { name: "01-idea", waitPhase: "idea", minMs: 650 },
  { name: "02-blueprint", waitPhase: "blueprint", minMs: 1700 },
  { name: "03-interior", waitPhase: "interior", minMs: 5200 },
  { name: "04-exterior", waitPhase: "exterior", minMs: 7600 },
  { name: "05-logo", waitPhase: "logo", minMs: 9900 },
  { name: "06-enter", waitPhase: "enter", minMs: 11200 }
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } }
  });
  await context.addInitScript(() => {
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
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(`${BASE}${ROUTE}`, { waitUntil: "load" });
  await page.waitForSelector(".olcf-root[data-phase]", { timeout: 30000 });

  const t0 = Date.now();
  const audit = [];

  for (const shot of SHOTS) {
    await page.waitForFunction(
      (phase) => document.querySelector(".olcf-root")?.getAttribute("data-phase") === phase,
      shot.waitPhase,
      { timeout: 20000 }
    );
    const elapsed = Date.now() - t0;
    if (elapsed < shot.minMs) {
      await page.waitForTimeout(shot.minMs - elapsed);
    }
    await page.waitForTimeout(shot.waitPhase === "exterior" ? 1200 : shot.waitPhase === "logo" ? 800 : 450);

    const snap = await page.evaluate(() => {
      const rect = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      };
      return {
        phase: document.querySelector(".olcf-root")?.getAttribute("data-phase"),
        stage: rect(".olcf-stage"),
        hasMedia: !!document.querySelector(".olcf-media-image, .olcf-media-video")
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

  fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify({ audit, errors }, null, 2));
  console.log(JSON.stringify({ out: OUT, audit, errors }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
