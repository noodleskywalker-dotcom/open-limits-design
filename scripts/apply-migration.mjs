#!/usr/bin/env node
/**
 * Apply SQL migration to live Supabase via Management API or psql.
 * Requires SUPABASE_ACCESS_TOKEN or SUPABASE_DB_URL in environment.
 */
import { execSync } from "node:child_process";
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

const sqlFile = process.argv[2] ?? "supabase/migrations/fix_media_relationships.sql";
const sql = fs.readFileSync(path.join(process.cwd(), sqlFile), "utf8");
const projectRef =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

async function viaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token || !projectRef) return false;

  console.log("Applying via Supabase Management API...");
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: sql })
  });

  const body = await response.text();
  if (!response.ok) {
    console.error("Management API failed:", response.status, body.slice(0, 500));
    return false;
  }

  console.log("Management API success:", body.slice(0, 300));
  return true;
}

function viaPsql() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) return false;

  console.log("Applying via psql...");
  execSync(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -f "${sqlFile}"`, {
    stdio: "inherit",
    cwd: process.cwd()
  });
  return true;
}

(async () => {
  if (await viaManagementApi()) process.exit(0);
  if (viaPsql()) process.exit(0);

  console.error(`
Could not apply migration automatically.
Set one of:
  SUPABASE_ACCESS_TOKEN  (from supabase login / dashboard)
  SUPABASE_DB_URL        (postgres connection string)

Then run:
  node scripts/apply-migration.mjs ${sqlFile}

Or paste the SQL into Supabase Dashboard → SQL Editor:
  https://supabase.com/dashboard/project/${projectRef ?? "YOUR_REF"}/sql
`);
  process.exit(1);
})();
