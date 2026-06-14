#!/usr/bin/env node
/**
 * Capture creation film — /prototype/open-limits-client-film
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3001";
const ROUTE = "/prototype/open-limits-client-film";
const OUT = path.join(process.cwd(), "artifacts", "prototype-visuals", "open-limits-client-film");

const SHOTS = [
  { name: "01-opening", waitBeat: "opening", holdMs: 900 },
  { name: "02-blueprint", waitBeat: "drawing", holdMs: 1800 },
  { name: "03-moment", waitBeat: "moment", holdMs: 2200 },
  { name: "04-architecture", waitBeat: "architecture", holdMs: 1800 },
  { name: "05-identity", waitBeat: "identity", holdMs: 1200 },
  { name: "06-end", waitBeat: "end", holdMs: 600 }
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
    if (/intro-film/i.test(req.url())) mediaRequests.push(req.url());
  });

  await page.goto(`${BASE}${ROUTE}`, { waitUntil: "load" });
  await page.waitForSelector(".olcrt-root[data-beat]", { timeout: 30000 });
  await page.waitForTimeout(300);

  const audit = [];
  let lastBeat = "";

  for (const shot of SHOTS) {
    if (shot.waitBeat !== lastBeat) {
      await page.waitForFunction(
        (beat) => {
          const root = document.querySelector(".olcrt-root");
          return root?.getAttribute("data-beat") === beat || root?.getAttribute("data-phase") === beat;
        },
        shot.waitBeat,
        { timeout: 60000 }
      );
      lastBeat = shot.waitBeat;
    }
    await page.waitForTimeout(shot.holdMs ?? 450);

    const snap = await page.evaluate(() => {
      const root = document.querySelector(".olcrt-root");
      return {
        beat: root?.getAttribute("data-beat") ?? root?.getAttribute("data-phase"),
        filmMs: Number(root?.getAttribute("data-elapsed") ?? 0),
        hasCanvas: !!document.querySelector(".olcrt-canvas-wrap canvas"),
        hasPencil: !!document.querySelector(".olcrt-film-pencil"),
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
    if (latest) fs.copyFileSync(path.join(OUT, latest), path.join(OUT, "full-animation.webm"));
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
    architecture: "creation-film-unified",
    zeroMediaRequests: mediaRequests.length === 0,
    mediaRequests,
    zeroMediaDom: audit.every((a) => !a.hasIntroMedia),
    beatsCaptured: audit.map((a) => a.beat)
  };

  fs.writeFileSync(path.join(OUT, "verification.json"), JSON.stringify(verification, null, 2));
  fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify({ audit, errors, verification }, null, 2));
  console.log(JSON.stringify({ out: OUT, verification, audit, errors }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
