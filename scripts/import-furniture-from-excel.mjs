#!/usr/bin/env node
/**
 * Import furniture from Excel into Supabase.
 * REQUIRES prior analysis approval and --confirm flag.
 *
 * Usage:
 *   node scripts/analyze-furniture-excel.mjs [file.xlsx]   # analyze first
 *   node scripts/import-furniture-from-excel.mjs --dry-run [file.xlsx]
 *   node scripts/import-furniture-from-excel.mjs --confirm [file.xlsx]
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  analyzeFurnitureExcel,
  formatAnalysisReport,
  resolveExcelPath
} from "../lib/furniture/excel-analyze.mjs";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    if (!process.env[trimmed.slice(0, index).trim()]) {
      process.env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const confirm = args.includes("--confirm");
const inputPath = args.find((arg) => !arg.startsWith("--")) ?? null;

if (!dryRun && !confirm) {
  console.error("Import blocked — run analysis first, then import with --confirm or preview with --dry-run.");
  console.error("");
  console.error("  node scripts/analyze-furniture-excel.mjs [file.xlsx]");
  console.error("  node scripts/import-furniture-from-excel.mjs --dry-run [file.xlsx]");
  console.error("  node scripts/import-furniture-from-excel.mjs --confirm [file.xlsx]");
  process.exit(2);
}

const filePath = resolveExcelPath(inputPath);
if (!filePath) {
  console.error("Excel file not found.");
  process.exit(1);
}

const report = await analyzeFurnitureExcel(filePath);
console.log(formatAnalysisReport(report));
console.log("");

if (dryRun) {
  console.log("DRY RUN — no database or storage changes made.");
  console.log(`Would process ${report.furnitureItemCount} furniture item(s).`);
  console.log(`Would upload ${report.embeddedImageCount} embedded image(s) when image mapping is implemented.`);
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const { data: categories, error: categoryError } = await supabase
  .from("furniture_categories")
  .select("id, slug, name");
if (categoryError) {
  console.error("Cannot load furniture_categories:", categoryError.message);
  process.exit(1);
}

async function ensureCategory(name) {
  if (!name) return null;
  const slug = slugify(name);
  let match = categories.find((c) => c.slug === slug || c.name.toLowerCase() === name.toLowerCase());
  if (match) return match.id;

  const { data, error } = await supabase
    .from("furniture_categories")
    .insert({ slug, name, published: true, sort_order: categories.length + 1 })
    .select("id, slug, name")
    .single();
  if (error) throw new Error(error.message);
  categories.push(data);
  console.log(`created category: ${name}`);
  return data.id;
}

const fallbackCategory = categories.find((c) => c.slug === "custom-furniture") ?? categories[0];
let imported = 0;
let skipped = 0;

for (const sheet of report.sheets) {
  for (const item of sheet.items) {
    const slug = item.slug || slugify(item.title);
    const { data: existing } = await supabase.from("furniture_items").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      console.log(`skip (exists): ${item.title}`);
      skipped += 1;
      continue;
    }

    const categoryId = (await ensureCategory(item.category)) ?? fallbackCategory?.id;
    if (!categoryId) {
      console.log(`skip (no category): ${item.title}`);
      skipped += 1;
      continue;
    }

    const dimensions =
      item.dimensions ??
      ([item.width, item.depth, item.height].filter(Boolean).join(" × ") || null);

    const { error } = await supabase.from("furniture_items").insert({
      slug,
      title: item.title,
      description: item.description ?? item.title,
      dimensions,
      width: item.width,
      depth: item.depth,
      height: item.height,
      materials: item.materials,
      finishes: item.finishes,
      collection: item.collection,
      category_id: categoryId,
      published: true
    });

    if (error) {
      console.log(`fail: ${item.title} — ${error.message}`);
      skipped += 1;
    } else {
      console.log(`ok:   ${item.title}`);
      imported += 1;
    }
  }
}

console.log(`\nImported ${imported}, skipped ${skipped}.`);
if (report.embeddedImageCount > 0) {
  console.log(
    `Note: ${report.embeddedImageCount} embedded image(s) detected — upload via Admin → Media or wait for image-mapping import enhancement.`
  );
}
