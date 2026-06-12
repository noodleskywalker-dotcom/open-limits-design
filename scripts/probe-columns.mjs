#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
loadEnv();

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function inspect(table) {
  const { data, error } = await admin.from(table).select("*").limit(1);
  console.log(`\n${table}:`, error ? error.message : Object.keys(data?.[0] ?? {}));
}

for (const t of ["team_members", "projects", "services", "furniture_items", "project_images", "materials", "company_profile"]) {
  await inspect(t);
}

// furniture join variants
for (const sel of [
  "*, featured_image:media_assets!furniture_items_featured_image_id_fkey(*)",
  "*, featured_image:media_assets!featured_image_id(*)",
  "id, title, featured_image_id"
]) {
  const { error } = await admin.from("furniture_items").select(sel).limit(1);
  console.log("\nfurniture select:", sel.slice(0, 60), error ? error.message : "OK");
}
