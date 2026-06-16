#!/usr/bin/env node
/**
 * AI assistant verification — API + browser widget checks.
 * Usage: node scripts/verify-ai-assistant.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "artifacts", "ai-verify");
const PROMPTS = [
  "catalog",
  "furniture",
  "materials",
  "projects",
  "services",
  "booking",
  "what is open limits"
];

async function testApi(prompt) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      stream: false
    })
  });
  const body = await res.json();
  return {
    status: res.status,
    ok: res.ok,
    reply: body.reply ?? body.error ?? "",
    links: body.links ?? [],
    previews: body.previews ?? [],
    source: body.source ?? null
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const apiResults = {};
  for (const prompt of PROMPTS) {
    apiResults[prompt] = await testApi(prompt);
  }

  const consoleErrors = [];
  const networkEvents = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/api/chat")) {
      networkEvents.push({ url, status: res.status(), ok: res.ok() });
    }
  });

  await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, "01-contact-before-open.png"), fullPage: false });

  await page.getByRole("button", { name: "Open AI assistant" }).click();
  await page.waitForSelector(".ai-panel", { state: "visible" });
  await page.screenshot({ path: path.join(OUT, "02-panel-open.png"), fullPage: false });

  const uiResults = {};
  const replies = [];

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    const beforeCount = await page.locator(".ai-message.assistant").count();

    await page.locator(".ai-input input").fill(prompt);
    await page.locator(".ai-input button[type='submit']").click();

    await page.waitForFunction(
      (expected) => document.querySelectorAll(".ai-message.user").length >= expected,
      i + 1,
      { timeout: 15000 }
    );

    await page.waitForFunction(
      () => {
        const typing = document.querySelector(".ai-typing");
        if (typing) return false;
        const assistants = [...document.querySelectorAll(".ai-message.assistant")];
        const last = assistants[assistants.length - 1];
        if (!last || !last.textContent.trim()) return false;
        // Wait until streaming finishes (message length stable for a beat)
        const len = last.textContent.trim().length;
        const key = "__aiLen";
        const prev = window[key];
        window[key] = len;
        return prev === len && len > 20;
      },
      { timeout: 30000 }
    );

    const assistantTexts = await page.locator(".ai-message.assistant").allTextContents();
    const lastReply = assistantTexts[assistantTexts.length - 1]?.trim() ?? "";
    replies.push(lastReply);

    const linkHrefs = await page.locator(".ai-link-chip").evaluateAll((els) =>
      els.map((el) => el.getAttribute("href"))
    );

    uiResults[prompt] = {
      assistantCount: await page.locator(".ai-message.assistant").count(),
      grew: (await page.locator(".ai-message.assistant").count()) > beforeCount,
      lastReply: lastReply.slice(0, 200),
      linkHrefs,
      previewCount: await page.locator(".ai-preview-card").count()
    };

    await page.screenshot({
      path: path.join(OUT, `03-prompt-${String(i + 1).padStart(2, "0")}-${prompt.replace(/\s+/g, "-")}.png`),
      fullPage: false
    });
  }

  const quickActionResults = {};
  for (const label of [
    "View Furniture Catalog",
    "Browse Materials",
    "Book a Meeting",
    "View Projects",
    "Ask About Services"
  ]) {
    const btn = page.getByRole("button", { name: label });
    quickActionResults[label] = {
      visible: await btn.isVisible(),
      enabled: await btn.isEnabled()
    };
  }

  await page.screenshot({ path: path.join(OUT, "04-final-state.png"), fullPage: false });
  await browser.close();

  const uniqueReplies = new Set(replies.filter(Boolean));
  const repeatsSame = uniqueReplies.size < replies.filter(Boolean).length;

  const report = {
    baseUrl: BASE,
    timestamp: new Date().toISOString(),
    env: {
      openaiKey: process.env.OPENAI_API_KEY ? "SET" : "MISSING",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING"
    },
    apiResults,
    uiResults,
    quickActionResults,
    consoleErrors,
    networkEvents,
    repeatsSameMessage: repeatsSame,
    uniqueReplyCount: uniqueReplies.size,
    totalPromptReplies: replies.filter(Boolean).length
  };

  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
