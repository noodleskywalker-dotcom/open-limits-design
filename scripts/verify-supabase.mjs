#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(2);
}

const anonClient = createClient(url, anonKey);
const adminClient = serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const tables = [
  "services",
  "team_members",
  "projects",
  "project_images",
  "media_assets",
  "company_profile",
  "homepage_hero_images",
  "project_comparisons",
  "furniture_categories",
  "furniture_items",
  "furniture_item_images",
  "materials",
  "furniture_item_materials",
  "bookings",
  "blocked_times",
  "admin_users",
  "site_settings",
  "site_content",
  "homepage_content",
  "leads",
  "ai_conversations",
  "chat_messages"
];

async function checkTable(client, table) {
  const { error, count } = await client.from(table).select("*", { count: "exact" }).limit(1);
  return { table, ok: !error, count: count ?? null, error: error?.message ?? null };
}

(async () => {
  console.log("Supabase URL:", url);
  const anonServices = await checkTable(anonClient, "services");
  console.log("Anon connection:", anonServices.ok ? "PASSED" : "FAILED");
  if (!anonServices.ok) {
    console.error(anonServices.error);
    process.exit(1);
  }

  if (!adminClient) {
    console.log("Service role key not set; skipping table inventory.");
    return;
  }

  const results = [];
  for (const table of tables) {
    results.push(await checkTable(adminClient, table));
  }

  console.table(results);

  const missing = results.filter((row) => !row.ok).map((row) => row.table);
  if (missing.length) {
    console.log("\nMissing CMS tables:", missing.join(", "));
    console.log("Run supabase/migrations/restore_open_limits.sql in the Supabase SQL Editor.");
    process.exit(3);
  }

  console.log("\nAll CMS tables exist.");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
