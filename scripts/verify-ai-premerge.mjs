#!/usr/bin/env node
/**
 * Pre-merge AI assistant checks — pages, quick actions, links, mobile.
 * Usage: node scripts/verify-ai-premerge.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "artifacts", "ai-premerge");

const PAGES = [
  { name: "homepage", path: "/", skipIntro: true },
  { name: "furniture", path: "/furniture" },
  { name: "materials", path: "/materials" },
  { name: "booking", path: "/book-meeting-with-ceo" }
];

const QUICK_ACTIONS = [
  { label: "View Furniture Catalog", prompt: "catalog", expectLink: "/furniture" },
  { label: "Browse Materials", prompt: "materials", expectLink: "/materials" },
  { label: "View Projects", prompt: "projects", expectLink: "/projects" },
  { label: "Ask About Services", prompt: "services", expectLink: "/services" },
  { label: "Book a Meeting", prompt: "booking", expectLink: "/book-meeting-with-ceo" }
];

async function waitForAssistantReply(page, minLen = 20) {
  await page.waitForFunction(
    (len) => {
      const typing = document.querySelector(".ai-typing");
      if (typing) return false;
      const assistants = [...document.querySelectorAll(".ai-message.assistant")];
      const last = assistants[assistants.length - 1];
      return last && last.textContent.trim().length >= len;
    },
    minLen,
    { timeout: 30000 }
  );
}

async function ensureAssistantOpen(page) {
  const panel = page.locator(".ai-panel");
  if (await panel.isVisible().catch(() => false)) return;

  const toggle = page.locator(".ai-toggle");
  await toggle.waitFor({ state: "visible", timeout: 15000 });
  const clickable = await page.evaluate(() => {
    const btn = document.querySelector(".ai-toggle");
    if (!btn) return false;
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el?.classList?.contains("ai-toggle") ?? false;
  });
  await toggle.click({ force: !clickable });
  await panel.waitFor({ state: "visible", timeout: 15000 });
}

async function dismissIntroIfPresent(page) {
  const skip = page.locator(".ol-vintro-skip");
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForSelector(".ol-vintro-root", { state: "hidden", timeout: 5000 }).catch(() => {});
  }
}

async function testPageDesktop(browser, pageDef) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  const network = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.url().includes("/api/chat")) {
      network.push({ status: res.status(), ok: res.ok() });
    }
  });

  await page.goto(`${BASE}${pageDef.path}`, { waitUntil: "networkidle" });
  if (pageDef.skipIntro) {
    // Test widget during intro (z-index) — do not dismiss first
  } else {
    await dismissIntroIfPresent(page);
  }

  const toggleClickable = await page.evaluate(() => {
    const btn = document.querySelector(".ai-toggle");
    if (!btn) return { found: false };
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      found: true,
      isAi: el?.classList?.contains("ai-toggle"),
      blocker: el?.className || el?.tagName
    };
  });

  await ensureAssistantOpen(page);
  await page.screenshot({ path: path.join(OUT, `desktop-${pageDef.name}-open.png`) });

  await page.locator(".ai-input input").fill("catalog");
  await page.locator(".ai-input button[type='submit']").click();
  await waitForAssistantReply(page);

  const reply = await page.locator(".ai-message.assistant").last().textContent();
  const chatOk = network.every((n) => n.ok);

  await page.close();

  return {
    page: pageDef.name,
    toggleClickable: toggleClickable.isAi === true,
    toggleBlocker: toggleClickable.blocker ?? null,
    widgetOpens: true,
    sendWorks: chatOk && (reply?.trim().length ?? 0) > 10,
    replyPreview: reply?.trim().slice(0, 100) ?? "",
    consoleErrors,
    network
  };
}

async function testQuickActions(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
  await ensureAssistantOpen(page);

  const results = {};
  for (const action of QUICK_ACTIONS) {
    const before = await page.locator(".ai-message.user").count();
    await page.getByRole("button", { name: action.label }).click();
    await page.waitForFunction((n) => document.querySelectorAll(".ai-message.user").length > n, before, {
      timeout: 15000
    });
    await waitForAssistantReply(page, 10);

    const lastUser = await page.locator(".ai-message.user").last().textContent();
    const lastReply = await page.locator(".ai-message.assistant").last().textContent();
    const hasExpectedLink = await page
      .locator(`.ai-link-chip[href="${action.expectLink}"]`)
      .first()
      .isVisible()
      .catch(() => false);

    results[action.prompt] = {
      label: action.label,
      userText: lastUser?.trim(),
      replyPreview: lastReply?.trim().slice(0, 120),
      hasExpectedLink,
      pass: lastUser?.trim() === action.prompt && (lastReply?.trim().length ?? 0) > 5
    };
  }

  await page.screenshot({ path: path.join(OUT, "desktop-quick-actions-final.png") });
  await page.close();
  return results;
}

async function testLinkNavigation(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
  await ensureAssistantOpen(page);

  await page.locator(".ai-input input").fill("materials");
  await page.locator(".ai-input button[type='submit']").click();
  await waitForAssistantReply(page);

  const link = page.locator('.ai-link-chip[href="/materials"]').first();
  await link.waitFor({ state: "visible" });
  await link.click();
  await page.waitForURL(/\/materials/, { timeout: 15000 });

  const urlOk = page.url().includes("/materials");

  await page.goBack({ waitUntil: "networkidle" });
  await ensureAssistantOpen(page);

  await page.locator(".ai-input input").fill("booking");
  await page.locator(".ai-input button[type='submit']").click();
  await waitForAssistantReply(page);
  await page.locator('.ai-link-chip[href="/book-meeting-with-ceo"]').first().click();
  await page.waitForURL(/book-meeting-with-ceo/, { timeout: 15000 });
  const previewNavOk = page.url().includes("book-meeting-with-ceo");

  await page.screenshot({ path: path.join(OUT, "desktop-link-nav-booking.png") });
  await page.close();

  return {
    materialsLinkNav: urlOk,
    bookingLinkNav: previewNavOk
  };
}

async function testMobile(browser) {
  const iphone = devices["iPhone 13"];
  const page = await browser.newPage({ ...iphone, viewport: iphone.viewport });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const toggleVisible = await page.locator(".ai-toggle").isVisible();
  const toggleClickable = await page.evaluate(() => {
    const btn = document.querySelector(".ai-toggle");
    if (!btn) return false;
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el?.classList?.contains("ai-toggle") ?? false;
  });

  await page.locator(".ai-toggle").click({ force: !toggleClickable });
  await page.waitForSelector(".ai-panel", { state: "visible" });

  const layout = await page.evaluate(() => {
    const panel = document.querySelector(".ai-panel");
    const input = document.querySelector(".ai-input input");
    const send = document.querySelector(".ai-input button[type='submit']");
    const footer = document.querySelector(".site-footer");
    const intro = document.querySelector(".ol-vintro-root");
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height };
    };

    const overlaps = (a, b) => {
      if (!a || !b) return false;
      return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    };

    const panelR = rect(panel);
    const inputR = rect(input);
    const sendR = rect(send);
    const footerR = rect(footer);
    const introR = intro && getComputedStyle(intro).opacity !== "0" ? rect(intro) : null;

    return {
      viewport: { w: vw, h: vh },
      panel: panelR,
      input: inputR,
      send: sendR,
      inputVisible: inputR ? inputR.top >= 0 && inputR.bottom <= vh && inputR.h > 0 : false,
      sendVisible: sendR ? sendR.top >= 0 && sendR.bottom <= vh && sendR.h > 0 : false,
      panelInViewport: panelR ? panelR.top >= 0 && panelR.bottom <= vh + 2 : false,
      overlapsFooter: overlaps(panelR, footerR),
      overlapsIntro: overlaps(panelR, introR),
      introCoversToggle: (() => {
        const btn = document.querySelector(".ai-toggle");
        if (!btn) return false;
        const r = btn.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !el?.classList?.contains("ai-toggle");
      })()
    };
  });

  await page.screenshot({ path: path.join(OUT, "mobile-homepage-open.png"), fullPage: false });

  await page.locator(".ai-input input").fill("services");
  await page.locator(".ai-input button[type='submit']").click();
  await waitForAssistantReply(page, 10);
  await page.screenshot({ path: path.join(OUT, "mobile-homepage-reply.png"), fullPage: false });

  await page.close();

  return {
    toggleVisible,
    toggleClickable,
    widgetOpens: true,
    ...layout,
    pass:
      toggleVisible &&
      layout.inputVisible &&
      layout.sendVisible &&
      !layout.overlapsFooter &&
      !layout.overlapsIntro
  };
}

async function checkProductionEnv() {
  const notes = [];
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING";
  let supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING";
  let openai = process.env.OPENAI_API_KEY ? "SET" : "MISSING (optional)";

  if (supabaseUrl === "MISSING" || supabaseAnon === "MISSING") {
    notes.push("Local/cloud workspace has no Supabase env — production must set these in Vercel.");
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
    OPENAI_API_KEY: openai,
    verifiableHere: false,
    notes
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const pageResults = {};
  for (const pageDef of PAGES) {
    pageResults[pageDef.name] = await testPageDesktop(browser, pageDef);
  }

  const quickActions = await testQuickActions(browser);
  const linkNav = await testLinkNavigation(browser);
  const mobile = await testMobile(browser);
  const productionEnv = await checkProductionEnv();

  await browser.close();

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE,
    pageResults,
    quickActions,
    linkNav,
    mobile,
    productionEnv
  };

  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
