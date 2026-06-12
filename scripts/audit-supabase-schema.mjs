#!/usr/bin/env node
/**
 * Deep audit of live Supabase schema: tables, columns, FK joins, storage.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase env vars");
  process.exit(2);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const anon = anonKey ? createClient(url, anonKey) : null;

const REQUIRED_TABLES = [
  "media_assets",
  "team_members",
  "projects",
  "furniture_categories",
  "furniture_items",
  "furniture_item_images",
  "materials",
  "bookings",
  "leads"
];

const FK_JOINS = [
  {
    name: "team_members.photo_id -> media_assets",
    table: "team_members",
    select: "*, photo:media_assets(*)"
  },
  {
    name: "company_profile.ceo_image_id -> media_assets",
    table: "company_profile",
    select: "*, ceo_image:media_assets(*)"
  },
  {
    name: "projects.featured_image_id -> media_assets",
    table: "projects",
    select: "*, featured_image:media_assets(*)"
  },
  {
    name: "furniture_items.featured_image_id -> media_assets",
    table: "furniture_items",
    select: "*, featured_image:media_assets(*)"
  },
  {
    name: "services.image_id -> media_assets",
    table: "services",
    select: "*, image:media_assets(*)"
  },
  {
    name: "materials.image_id -> media_assets",
    table: "materials",
    select: "*, image:media_assets(*)"
  }
];

const COLUMN_CHECKS = [
  { table: "team_members", columns: ["photo_id", "photo_url", "is_active"] },
  { table: "projects", columns: ["featured_image_id", "cover_image_url", "is_published"] },
  { table: "furniture_items", columns: ["featured_image_id", "category_id"] },
  { table: "company_profile", columns: ["ceo_image_id", "phone2", "map_query"] },
  { table: "services", columns: ["image_id", "is_active"] },
  { table: "materials", columns: ["image_id", "published"] }
];

async function tableExists(table) {
  const { error, count } = await admin.from(table).select("*", { count: "exact", head: true });
  return { table, ok: !error, error: error?.message ?? null, count: count ?? null };
}

async function columnExists(table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  return { table, column, ok: !error, error: error?.message ?? null };
}

async function testJoin({ name, table, select }) {
  const { error } = await admin.from(table).select(select).limit(1);
  return { name, table, ok: !error, error: error?.message ?? null };
}

async function testStorage() {
  const { data, error } = await admin.storage.from("site-media").list("", { limit: 1 });
  return { bucket: "site-media", ok: !error, error: error?.message ?? null, files: data?.length ?? 0 };
}

async function testInsertMedia() {
  const testPath = `audit/test-${Date.now()}.txt`;
  const blob = new Blob(["audit"], { type: "text/plain" });
  const { error: uploadError } = await admin.storage.from("site-media").upload(testPath, blob, {
    upsert: true
  });
  if (uploadError) return { step: "storage_upload", ok: false, error: uploadError.message };

  const publicUrl = admin.storage.from("site-media").getPublicUrl(testPath).data.publicUrl;
  const { data, error: insertError } = await admin.from("media_assets").insert({
    title: "Audit test asset",
    category: "Company",
    storage_path: testPath,
    public_url: publicUrl,
    mime_type: "text/plain"
  }).select("id").single();

  if (insertError) {
    await admin.storage.from("site-media").remove([testPath]);
    return { step: "media_assets_insert", ok: false, error: insertError.message };
  }

  // Test team_members FK update if photo_id column works
  const { data: member } = await admin.from("team_members").select("id").limit(1).maybeSingle();
  let teamFkOk = null;
  let teamFkError = null;
  if (member?.id) {
    const { error: teamError } = await admin
      .from("team_members")
      .update({ photo_id: data.id })
      .eq("id", member.id);
    teamFkOk = !teamError;
    teamFkError = teamError?.message ?? null;
    if (!teamError) {
      await admin.from("team_members").update({ photo_id: null }).eq("id", member.id);
    }
  }

  await admin.from("media_assets").delete().eq("id", data.id);
  await admin.storage.from("site-media").remove([testPath]);

  return {
    step: "full_media_pipeline",
    ok: true,
    mediaId: data.id,
    teamFkOk,
    teamFkError
  };
}

console.log("=== SUPABASE LIVE AUDIT ===");
console.log("URL:", url);
console.log("");

console.log("--- Required tables ---");
const tableResults = [];
for (const table of REQUIRED_TABLES) {
  tableResults.push(await tableExists(table));
}
console.table(tableResults);

console.log("\n--- Column checks ---");
const columnResults = [];
for (const { table, columns } of COLUMN_CHECKS) {
  for (const column of columns) {
    columnResults.push(await columnExists(table, column));
  }
}
console.table(columnResults);

console.log("\n--- FK join tests (schema cache) ---");
const joinResults = [];
for (const join of FK_JOINS) {
  joinResults.push(await testJoin(join));
}
console.table(joinResults);

console.log("\n--- Storage bucket ---");
console.log(await testStorage());

console.log("\n--- Media upload pipeline test ---");
const pipeline = await testInsertMedia();
console.log(pipeline);

if (anon) {
  console.log("\n--- Anon join test (team_members -> media_assets) ---");
  const { error } = await anon.from("team_members").select("*, photo:media_assets(*)").limit(1);
  console.log(error ? `FAIL: ${error.message}` : "PASS");
}

const missingTables = tableResults.filter((r) => !r.ok).map((r) => r.table);
const brokenJoins = joinResults.filter((r) => !r.ok);
const missingColumns = columnResults.filter((r) => !r.ok);

console.log("\n=== SUMMARY ===");
console.log("Missing tables:", missingTables.length ? missingTables.join(", ") : "none");
console.log(
  "Missing columns:",
  missingColumns.length
    ? missingColumns.map((c) => `${c.table}.${c.column}`).join(", ")
    : "none"
);
console.log(
  "Broken FK joins:",
  brokenJoins.length ? brokenJoins.map((j) => `${j.name}: ${j.error}`).join("\n  ") : "none"
);

process.exit(missingTables.length || brokenJoins.length ? 1 : 0);
