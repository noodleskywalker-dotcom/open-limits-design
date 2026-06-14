import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local optional when vars are exported
  }
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const KNOWN_DUPLICATES = [
  "raghad-bedroom-study-table",
  "dining-exeon",
  "majlis-02-sofa",
  "majlis-02-coffee-table",
  "majlis-02-side-table",
  "ff-daily-living-dressing-table",
  "dema-bedroom-night-table",
  "external-majlis-op-01-side-table"
];

async function main() {
  const { data: items, error } = await supabase
    .from("furniture_items")
    .select("id, title, slug")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load furniture_items:", error.message);
    process.exit(1);
  }

  const used = new Set();
  const updates = [];

  for (const item of items ?? []) {
    let slug = item.slug || slugify(item.title);
    if (!slug) slug = "item";

    if (used.has(slug) || KNOWN_DUPLICATES.includes(slug)) {
      let counter = 2;
      let next = `${slug}-${counter}`;
      while (used.has(next)) {
        counter += 1;
        next = `${slug}-${counter}`;
      }
      slug = next;
      updates.push({ id: item.id, title: item.title, old: item.slug, new: slug });
    }

    used.add(slug);
    if (slug !== item.slug) {
      const { error: updateError } = await supabase
        .from("furniture_items")
        .update({ slug })
        .eq("id", item.id);
      if (updateError) {
        console.error(`Failed to update ${item.title}:`, updateError.message);
      }
    }
  }

  if (!updates.length) {
    console.log("All furniture slugs are unique — no changes needed.");
    return;
  }

  console.log("Fixed duplicate slugs:");
  for (const row of updates) {
    console.log(`  ${row.title}: ${row.old} -> ${row.new}`);
  }
}

main();
