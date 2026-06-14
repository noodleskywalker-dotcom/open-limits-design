#!/usr/bin/env node
/**
 * Capture screenshots + video for /prototype/open-limits-film-grade
 * Usage: node scripts/capture-film-grade.mjs [baseUrl]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3001";
const ROUTE = "/prototype/open-limits-film-grade";
const OUT = path.join(process.cwd(), "artifacts", "prototype-visuals", "open-limits-film-grade");

const SHOTS = [
  { name: "01-idea-0.8s", waitPhase: "idea", minMs: 650 },
  { name: "02-blueprint-2.0s", waitPhase: "blueprint", minMs: 1700 },
  { name: "03-structure-3.5s", waitPhase: "structure", minMs: 3200 },
  { name: "04-interior-5.5s", waitPhase: "interior", minMs: 5200 },
  { name: "05-exterior-8.0s", waitPhase: "exterior", minMs: 7600 },
  { name: "06-logo-10.2s", waitPhase: "logo", minMs: 9900 },
  { name: "07-enter-11.5s", waitPhase: "enter", minMs: 11200 }
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } }
  });
  await context.addInitScript(() => {
    localStorage.removeItem("ol-film-grade-dismissed");
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" });

  const t0 = Date.now();
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".olfg-root[data-phase]", { timeout: 30000 });

  const audit = [];

  for (const shot of SHOTS) {
    await page.waitForFunction(
      (phase) => document.querySelector(".olfg-root")?.getAttribute("data-phase") === phase,
      shot.waitPhase,
      { timeout: 20000 }
    );
    const elapsed = Date.now() - t0;
    if (elapsed < shot.minMs) {
      await page.waitForTimeout(shot.minMs - elapsed);
    }
    await page.waitForTimeout(
      shot.waitPhase === "exterior" ? 1200 : shot.waitPhase === "logo" ? 800 : 400
    );

    const snap = await page.evaluate(() => {
      const rect = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      };
      return {
        phase: document.querySelector(".olfg-root")?.getAttribute("data-phase"),
        stage: rect(".olfg-stage"),
        hasMedia: !!document.querySelector(".olfg-media-image, .olfg-media-video")
      };
    });

    audit.push({ shot: shot.name, targetPhase: shot.waitPhase, ...snap });
    await page.screenshot({ path: path.join(OUT, `${shot.name}.png`) });
  }

  await page.waitForTimeout(800);
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
    execSync(
      `ffmpeg -y -i "${path.join(OUT, "full-animation.webm")}" -c:v libx264 -pix_fmt yuv420p "${path.join(OUT, "full-animation.mp4")}"`,
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
