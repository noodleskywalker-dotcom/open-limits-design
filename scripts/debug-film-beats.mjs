import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3001";
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto(`${BASE}/prototype/open-limits-client-film`, { waitUntil: "load" });
await page.waitForSelector(".olcrt-root", { timeout: 15000 });
for (let i = 0; i < 30; i++) {
  const s = await page.evaluate(() => {
    const r = document.querySelector(".olcrt-root");
    return {
      beat: r?.getAttribute("data-beat"),
      phase: r?.getAttribute("data-phase"),
      elapsed: r?.getAttribute("data-elapsed")
    };
  });
  console.log(i, JSON.stringify(s));
  await page.waitForTimeout(500);
}
await browser.close();
