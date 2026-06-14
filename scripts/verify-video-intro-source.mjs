#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3001";
const VIDEO_PATH = path.join(process.cwd(), "public/intro-video/open-limits-intro.mp4");
const EXPECTED_SRC = "/intro-video/open-limits-intro.mp4";

function fileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return createHash("md5").update(buf).digest("hex");
}

async function main() {
  const localHash = fileHash(VIDEO_PATH);
  const localSize = fs.statSync(VIDEO_PATH).size;

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => localStorage.removeItem("ol-intro-v2-complete"));
  const page = await context.newPage();

  const network = { videoUrl: null, status: null, contentLength: null };
  page.on("response", async (res) => {
    if (res.url().includes("open-limits-intro.mp4")) {
      network.videoUrl = res.url();
      network.status = res.status();
      network.contentLength = res.headers()["content-length"] ?? null;
    }
  });

  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.waitForSelector(".ol-vintro-root", { timeout: 20000 });

  const dom = await page.evaluate((expectedSrc) => {
    const v = document.querySelector(".ol-vintro-video");
    return {
      hasVideo: !!v,
      src: v?.getAttribute("src") ?? null,
      srcMatches: v?.getAttribute("src") === expectedSrc,
      muted: v?.muted ?? null,
      autoplay: v?.hasAttribute("autoplay") ?? null,
      playsInline: v?.playsInline ?? null,
      preload: v?.getAttribute("preload") ?? null,
      loop: v?.loop ?? null,
      controls: v?.controls ?? null
    };
  }, EXPECTED_SRC);

  await page.waitForTimeout(1500);

  const result = {
    fileOnDisk: {
      path: "public/intro-video/open-limits-intro.mp4",
      sizeBytes: localSize,
      md5: localHash
    },
    codeConstant: EXPECTED_SRC,
    dom,
    network,
    pass:
      dom.hasVideo &&
      dom.srcMatches &&
      (network.status === 200 || network.status === 206) &&
      network.videoUrl?.includes("open-limits-intro.mp4") &&
      Number(network.contentLength) === localSize
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
