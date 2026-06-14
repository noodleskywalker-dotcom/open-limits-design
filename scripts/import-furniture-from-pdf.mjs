#!/usr/bin/env node
/**
 * Import furniture from PDF into Supabase.
 *
 * Usage:
 *   node scripts/analyze-furniture-pdf.mjs "AHMED SALAH data.pdf"
 *   node scripts/import-furniture-from-pdf.mjs "AHMED SALAH data.pdf"
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { importFurnitureFromPdf } from "../lib/furniture/pdf-import.mjs";
import { resolvePdfPath } from "../lib/furniture/pdf-analyze.mjs";

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

const inputPath = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? null;
const filePath = resolvePdfPath(inputPath);

if (!filePath) {
  console.error("PDF file not found. Expected: AHMED SALAH data.pdf in project root.");
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

const buffer = fs.readFileSync(filePath);
const result = await importFurnitureFromPdf(buffer, supabase);

console.log("=== PDF IMPORT RESULT ===");
console.log(JSON.stringify(result, null, 2));

if (result.errors.length) process.exit(1);
