#!/usr/bin/env node
/**
 * Imports furniture items from ALI ALMOHANDI-FURNITURE.xlsx into Supabase.
 *
 * Usage:
 *   1. Place the Excel file in the project root (or pass a path as the first argument).
 *   2. npm install xlsx
 *   3. node scripts/import-furniture-from-excel.mjs [path-to-xlsx]
 *
 * Expected columns (case-insensitive, flexible): Name/Title, Category,
 * Description, Dimensions, Width, Depth/Length, Height, Materials, Collection.
 * Embedded images cannot be extracted by this script — upload photos through
 * Admin → Media (Furniture category) and assign them to items afterwards.
 */
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
    if (!process.env[trimmed.slice(0, index).trim()]) {
      process.env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const filePath = process.argv[2] ?? path.join(process.cwd(), "ALI ALMOHANDI-FURNITURE.xlsx");
if (!fs.existsSync(filePath)) {
  console.error(`Excel file not found: ${filePath}`);
  console.error("Place ALI ALMOHANDI-FURNITURE.xlsx in the project root or pass its path.");
  process.exit(1);
}

let XLSX;
try {
  XLSX = (await import("xlsx")).default;
} catch {
  console.error("The xlsx package is not installed. Run: npm install xlsx");
  process.exit(1);
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

const pick = (row, ...keys) => {
  for (const key of keys) {
    const match = Object.keys(row).find((k) => k.toLowerCase().includes(key));
    if (match && row[match] != null && String(row[match]).trim() !== "") {
      return String(row[match]).trim();
    }
  }
  return null;
};

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
console.log(`Read ${rows.length} rows from ${path.basename(filePath)}`);

const { data: categories, error: categoryError } = await supabase
  .from("furniture_categories")
  .select("id, slug, name");
if (categoryError) {
  console.error("Cannot load furniture_categories:", categoryError.message);
  process.exit(1);
}

function resolveCategoryId(name) {
  if (!name) return null;
  const target = slugify(name);
  const match = categories.find(
    (c) => c.slug === target || c.name.toLowerCase() === name.toLowerCase()
  );
  return match?.id ?? null;
}

const fallbackCategory = categories.find((c) => c.slug === "custom-furniture") ?? categories[0];
let imported = 0;
let skipped = 0;

for (const row of rows) {
  const title = pick(row, "name", "title", "item", "product");
  if (!title) {
    skipped += 1;
    continue;
  }

  const slug = slugify(title);
  const { data: existing } = await supabase
    .from("furniture_items")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    console.log(`skip (exists): ${title}`);
    skipped += 1;
    continue;
  }

  const categoryId = resolveCategoryId(pick(row, "category", "type", "group")) ?? fallbackCategory?.id;
  if (!categoryId) {
    console.log(`skip (no category): ${title}`);
    skipped += 1;
    continue;
  }

  const { error } = await supabase.from("furniture_items").insert({
    slug,
    title,
    description: pick(row, "description", "details", "info") ?? title,
    dimensions: pick(row, "dimension", "size"),
    width: pick(row, "width"),
    depth: pick(row, "depth", "length"),
    height: pick(row, "height"),
    materials: pick(row, "material"),
    finishes: pick(row, "finish"),
    features: pick(row, "feature"),
    collection: pick(row, "collection", "bedroom", "set"),
    category_id: categoryId,
    published: true
  });

  if (error) {
    console.log(`fail: ${title} — ${error.message}`);
    skipped += 1;
  } else {
    console.log(`ok:   ${title}`);
    imported += 1;
  }
}

console.log(`\nImported ${imported}, skipped ${skipped}.`);
console.log("Now upload product photos in Admin → Media and assign them to each item.");
