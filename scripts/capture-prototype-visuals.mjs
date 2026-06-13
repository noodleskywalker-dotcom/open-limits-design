#!/usr/bin/env node
/**
 * Capture screenshots + video for intro prototype routes.
 * Usage: node scripts/capture-prototype-visuals.mjs [baseUrl]
 * Requires: server running (prefer `npm run build && PORT=3001 npm run start`), playwright chromium.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3001";
const OUT = path.join(process.cwd(), "artifacts", "prototype-visuals");

const PROTOTYPES = [
  {
    id: "current-cinematic",
    route: "/prototype/current-cinematic",
    firstMs: 400,
    middleMs: 5500,
    finalMs: 9500,
    enterMs: 10600,
    videoMs: 13500,
    note: "PR #9 cinematic — auto-enter at ~12.4s"
  },
  {
    id: "signature-open-limits",
    route: "/prototype/signature-open-limits",
    firstMs: 800,
    middleMs: 6000,
    finalMs: 10000,
    enterMs: 11000,
    videoMs: 12000,
    note: "Signature storyboard — manual enter"
  }
];

async function preparePage(context) {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" });
  return page;
}

/** Single page load — cumulative waits preserve real wall-clock timing. */
async function captureScreenshots(page, proto, dir) {
  const shots = [
    { name: "01-first-frame", wait: proto.firstMs },
    { name: "02-middle-frame", wait: proto.middleMs },
    { name: "03-final-frame", wait: proto.finalMs },
    { name: "04-enter-experience", wait: proto.enterMs }
  ];

  await page.goto(`${BASE}${proto.route}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      !!document.querySelector(".luxury-intro, .sig-intro") ||
      !!document.querySelector(".prototype-showroom-mock"),
    { timeout: 15000 }
  );

  const results = [];
  let elapsed = 0;

  for (const shot of shots) {
    const delta = shot.wait - elapsed;
    if (delta > 0) await page.waitForTimeout(delta);
    elapsed = shot.wait;

    const phase = await page.evaluate(() => {
      const el = document.querySelector(".luxury-intro, .sig-intro");
      return {
        phase: el?.getAttribute("data-phase") ?? null,
        introVisible: !!el,
        showroomVisible: !!document.querySelector(".prototype-showroom-mock")
      };
    });

    const file = path.join(dir, `${shot.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    results.push({ ...shot, file, phase, elapsedMs: elapsed });
  }

  return results;
}

async function captureVideo(context, proto, dir) {
  const videoDir = path.join(dir, "video-temp");
  fs.mkdirSync(videoDir, { recursive: true });

  const videoContext = await context.browser().newContext({
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 },
    reducedMotion: "no-preference",
    colorScheme: "dark"
  });

  await videoContext.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (query.includes("prefers-reduced-motion")) {
        return {
          matches: false,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => true
        };
      }
      return orig(query);
    };
  });

  const page = await videoContext.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" });

  const start = Date.now();
  await page.goto(`${BASE}${proto.route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(proto.videoMs);
  const elapsed = Date.now() - start;

  await videoContext.close();

  const webms = fs.readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
  const webmPath = webms.length ? path.join(videoDir, webms[0]) : null;
  const outWebm = path.join(dir, "full-animation.webm");
  if (webmPath) fs.renameSync(webmPath, outWebm);
  fs.rmSync(videoDir, { recursive: true, force: true });

  return { outWebm: webmPath ? outWebm : null, elapsedMs: elapsed, videoMs: proto.videoMs };
}

async function estimateFps(page, proto) {
  await page.goto(`${BASE}${proto.route}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !!document.querySelector(".luxury-intro, .sig-intro"),
    { timeout: 15000 }
  );
  const samples = await page.evaluate(async () => {
    const frames = [];
    let last = performance.now();
    await new Promise((resolve) => {
      let count = 0;
      const max = 120;
      function tick(now) {
        frames.push(now - last);
        last = now;
        count += 1;
        if (count >= max) resolve(undefined);
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    return { avgFrameMs: avg, estimatedFps: 1000 / avg, sampleCount: frames.length };
  });
  return samples;
}

async function tryConvertMp4(webmPath, mp4Path) {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", webmPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4Path],
    { stdio: "pipe" }
  );
  return r.status === 0 ? mp4Path : null;
}

async function buildSideBySide(browser, protoIds) {
  const pairs = ["01-first-frame", "02-middle-frame", "03-final-frame", "04-enter-experience"];
  const { spawnSync } = await import("node:child_process");

  for (const pair of pairs) {
    const inputs = protoIds.map((id) => path.join(OUT, id, `${pair}.png`));
    if (!inputs.every((f) => fs.existsSync(f))) continue;

    const out = path.join(OUT, "comparison", `${pair}-side-by-side.png`);
    fs.mkdirSync(path.dirname(out), { recursive: true });

    const r = spawnSync(
      "ffmpeg",
      ["-y", "-i", inputs[0], "-i", inputs[1], "-filter_complex", "hstack=inputs=2", out],
      { stdio: "pipe" }
    );

    if (r.status !== 0) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 2560, height: 720 });
      await page.setContent(`
        <html><body style="margin:0;background:#111;display:flex;">
          <img src="file://${inputs[0]}" style="width:50vw;height:100vh;object-fit:contain;" />
          <img src="file://${inputs[1]}" style="width:50vw;height:100vh;object-fit:contain;" />
        </body></html>
      `);
      await page.screenshot({ path: out });
      await page.close();
    }
  }
}

async function buildComparisonVideo(protoIds) {
  const { spawnSync } = await import("node:child_process");
  const inputs = protoIds.map((id) => path.join(OUT, id, "full-animation.mp4"));
  if (!inputs.every((f) => fs.existsSync(f))) return null;

  const out = path.join(OUT, "comparison", "full-animation-side-by-side.mp4");
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputs[0],
      "-i",
      inputs[1],
      "-filter_complex",
      "[0:v][1:v]hstack=inputs=2[v]",
      "-map",
      "[v]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      out
    ],
    { stdio: "pipe" }
  );

  return r.status === 0 ? out : null;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: "no-preference",
    colorScheme: "dark"
  });

  await context.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (query.includes("prefers-reduced-motion")) {
        return {
          matches: false,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => true
        };
      }
      return orig(query);
    };
  });

  const report = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE,
    browser: "chromium (playwright headless, production server recommended)",
    prototypes: [],
    openLimitsPremium: { status: "NOT_CREATED", route: "/prototype/open-limits-premium" }
  };

  for (const proto of PROTOTYPES) {
    const dir = path.join(OUT, proto.id);
    fs.mkdirSync(dir, { recursive: true });

    console.log(`Capturing ${proto.id}...`);
    const page = await preparePage(context);
    const screenshots = await captureScreenshots(page, proto, dir);
    const fps = await estimateFps(page, proto);
    await page.close();

    const video = await captureVideo(context, proto, dir);
    let mp4 = null;
    if (video.outWebm && fs.existsSync(video.outWebm)) {
      mp4 = path.join(dir, "full-animation.mp4");
      const converted = await tryConvertMp4(video.outWebm, mp4);
      if (!converted) mp4 = null;
    }

    report.prototypes.push({
      id: proto.id,
      route: proto.route,
      note: proto.note,
      screenshots: screenshots.map((s) => ({
        path: path.relative(process.cwd(), s.file),
        targetMs: s.wait,
        phase: s.phase
      })),
      video: {
        webm: video.outWebm ? path.relative(process.cwd(), video.outWebm) : null,
        mp4: mp4 && fs.existsSync(mp4) ? path.relative(process.cwd(), mp4) : null,
        recordedMs: video.elapsedMs,
        targetMs: video.videoMs
      },
      fpsEstimate: fps
    });
  }

  await buildSideBySide(
    browser,
    PROTOTYPES.map((p) => p.id)
  );
  const comparisonVideo = await buildComparisonVideo(PROTOTYPES.map((p) => p.id));
  if (comparisonVideo) {
    report.comparisonVideo = path.relative(process.cwd(), comparisonVideo);
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
