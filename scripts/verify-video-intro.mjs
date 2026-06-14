#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3001";
const OUT = path.join(process.cwd(), "artifacts", "video-intro");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const results = { desktop: null, mobile: null, videoRequest: null, errors: [] };

  for (const [label, viewport] of [
    ["desktop", { width: 1280, height: 720 }],
    ["mobile", { width: 390, height: 844 }]
  ]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => localStorage.removeItem("ol-intro-v2-complete"));
    const page = await context.newPage();
    const videoRequests = [];
    page.on("request", (r) => {
      if (r.url().includes("open-limits-intro.mp4")) videoRequests.push(r.url());
    });
    page.on("pageerror", (e) => results.errors.push(`${label}: ${e.message}`));

    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await page.waitForSelector(".ol-vintro-root", { timeout: 15000 });

    const playing = await page.evaluate(async () => {
      const v = document.querySelector(".ol-vintro-video");
      if (!v) return { ok: false, reason: "no video element" };
      await new Promise((r) => setTimeout(r, 800));
      return {
        ok: true,
        paused: v.paused,
        readyState: v.readyState,
        src: v.getAttribute("src"),
        muted: v.muted,
        playsInline: v.playsInline,
        loop: v.loop,
        controls: v.controls
      };
    });

    await page.waitForTimeout(14000);
    await page.waitForSelector(".ol-vintro-cta", { timeout: 10000 });
    await page.screenshot({ path: path.join(OUT, `${label}-cta.png`) });

    results[label] = { playing, hasCta: true };
    if (videoRequests.length) results.videoRequest = videoRequests[0];
    await context.close();
  }

  fs.writeFileSync(path.join(OUT, "verification.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
