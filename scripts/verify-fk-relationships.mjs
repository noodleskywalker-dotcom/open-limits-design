#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
    }
  }
}
loadEnv();

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const CHECKS = [
  {
    label: "team_members -> media_assets",
    run: () =>
      admin.from("team_members").select("*, photo:media_assets!team_members_photo_id_fkey(*)").limit(3)
  },
  {
    label: "projects -> media_assets (featured)",
    run: () =>
      admin
        .from("projects")
        .select("*, featured_image:media_assets!projects_featured_image_id_fkey(*)")
        .limit(3)
  },
  {
    label: "project_images -> media_assets",
    run: () =>
      admin
        .from("project_images")
        .select("*, media:media_assets!project_images_media_id_fkey(*)")
        .limit(3)
  },
  {
    label: "furniture_items -> media_assets (featured)",
    run: () =>
      admin
        .from("furniture_items")
        .select("*, featured_image:media_assets!furniture_items_featured_image_id_fkey(*)")
        .limit(3)
  },
  {
    label: "furniture_item_images -> furniture_items + media_assets",
    run: () =>
      admin
        .from("furniture_item_images")
        .select(
          "*, furniture_item:furniture_items(id, title), media:media_assets!furniture_item_images_media_id_fkey(*)"
        )
        .limit(3)
  },
  {
    label: "materials -> media_assets",
    run: () =>
      admin.from("materials").select("*, image:media_assets!materials_image_id_fkey(*)").limit(3)
  },
  {
    label: "services -> media_assets",
    run: () => admin.from("services").select("*, image:media_assets!services_image_id_fkey(*)").limit(3)
  },
  {
    label: "company_profile -> media_assets (ceo)",
    run: () =>
      admin
        .from("company_profile")
        .select("*, ceo_image:media_assets!company_profile_ceo_image_id_fkey(*)")
        .eq("id", 1)
        .maybeSingle()
  }
];

console.log("=== FK RELATIONSHIP VERIFICATION ===\n");
const results = [];

for (const check of CHECKS) {
  const { data, error } = await check.run();
  const ok = !error;
  results.push({
    relationship: check.label,
    ok,
    rows: Array.isArray(data) ? data.length : data ? 1 : 0,
    error: error?.message ?? null
  });
}

console.table(results);

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.log("\nREMAINING FK ISSUES:");
  for (const f of failed) console.log(`  - ${f.relationship}: ${f.error}`);
  process.exit(1);
}

console.log("\nAll FK relationships verified successfully.");
process.exit(0);
