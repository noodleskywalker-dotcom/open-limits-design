#!/usr/bin/env node
/**
 * Extract furniture catalog text from a PDF (e.g. downloaded from Lumin / Google Drive).
 *
 * The Lumin viewer link requires sign-in — download the PDF first:
 *   1. Open the Lumin link while signed in
 *   2. Download the PDF to the project root
 *   3. Run: npm run furniture:extract-pdf
 *
 * Usage:
 *   npm run furniture:extract-pdf
 *   node scripts/extract-furniture-from-pdf.mjs "AHMED SALAH data.pdf"
 *   node scripts/extract-furniture-from-pdf.mjs --json path/to/catalog.pdf
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const inputPath = args.find((arg) => !arg.startsWith("--")) ?? null;

const CANDIDATES = [
  "AHMED SALAH data.pdf",
  "AHMED-SALAH-data.pdf",
  "furniture-catalog.pdf",
  "ALI ALMOHANDI-FURNITURE.pdf"
];

function resolvePdfPath(explicit) {
  if (explicit && fs.existsSync(explicit)) return path.resolve(explicit);
  for (const name of CANDIDATES) {
    const candidate = path.join(process.cwd(), name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Heuristic parse of catalog text into furniture rows. */
export function parseFurnitureFromText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  let current = null;

  const dimensionPattern = /(\d+\s*[x×]\s*\d+|\d+\s*cm|\d+\s*mm|w\s*[:\.]?\s*\d|d\s*[:\.]?\s*\d|h\s*[:\.]?\s*\d)/i;
  const materialPattern = /material|fabric|upholstery|wood|marble|leather|velvet|brass|oak/i;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/^(page|sheet|category|collection|open limits|armani|total)\b/i.test(line)) continue;
    if (line.length < 3) continue;

    const looksLikeTitle =
      line.length >= 4 &&
      line.length <= 120 &&
      /^[A-Z0-9]/.test(line) &&
      !dimensionPattern.test(line) &&
      !materialPattern.test(line) &&
      !/^\d+$/.test(line);

    if (looksLikeTitle && !current) {
      current = { title: line, description: [], dimensions: null, materials: null, category: null };
      continue;
    }

    if (!current) continue;

    if (dimensionPattern.test(line) && !current.dimensions) {
      current.dimensions = line;
      continue;
    }

    if (materialPattern.test(line) && !current.materials) {
      current.materials = line.replace(/^(materials?|fabric|upholstery)\s*[:\-]\s*/i, "");
      continue;
    }

    if (/^(sofa|majlis|chair|table|bed|dining|cabinet|light|bedroom|exterior)/i.test(lower)) {
      current.category = line;
      continue;
    }

    if (line.length > 8 && current.description.length < 4) {
      current.description.push(line);
    } else if (looksLikeTitle) {
      items.push(finishItem(current));
      current = { title: line, description: [], dimensions: null, materials: null, category: null };
    }
  }

  if (current) items.push(finishItem(current));
  return items.filter((item) => item.title.length > 2);
}

function finishItem(raw) {
  return {
    title: raw.title,
    slug: slugify(raw.title),
    description: raw.description.join(" ").trim() || raw.title,
    dimensions: raw.dimensions,
    materials: raw.materials,
    category: raw.category
  };
}

async function loadPdfParse() {
  const mod = await import("pdf-parse");
  return mod.default ?? mod;
}

const filePath = resolvePdfPath(inputPath);

if (!filePath) {
  console.error("PDF file not found.");
  console.error("");
  console.error("Download the catalog from Lumin (File → Download) and place it in the project root:");
  console.error("  - AHMED SALAH data.pdf");
  console.error("  - furniture-catalog.pdf");
  console.error("");
  console.error("Or pass a path:");
  console.error('  node scripts/extract-furniture-from-pdf.mjs "path/to/catalog.pdf"');
  console.error("");
  console.error("Lumin link (requires sign-in):");
  console.error(
    "  https://app.luminpdf.com/viewer/6a2c93228b00f5f6b20ad58a"
  );
  process.exit(1);
}

const pdfParse = await loadPdfParse();
const buffer = fs.readFileSync(filePath);
const parsed = await pdfParse(buffer);
const items = parseFurnitureFromText(parsed.text);

const report = {
  filePath,
  fileName: path.basename(filePath),
  pageCount: parsed.numpages,
  textLength: parsed.text.length,
  itemCount: items.length,
  items,
  textPreview: parsed.text.slice(0, 2000)
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("=".repeat(60));
  console.log("FURNITURE PDF EXTRACTION REPORT");
  console.log("=".repeat(60));
  console.log(`File: ${report.fileName}`);
  console.log(`Pages: ${report.pageCount}`);
  console.log(`Items detected: ${report.itemCount}`);
  console.log("");
  if (!items.length) {
    console.log("No structured items detected. Text preview:");
    console.log(report.textPreview);
  } else {
    console.log("--- DETECTED ITEMS (first 20) ---");
    for (const item of items.slice(0, 20)) {
      console.log(`• ${item.title}`);
      if (item.category) console.log(`  Category: ${item.category}`);
      if (item.dimensions) console.log(`  Dimensions: ${item.dimensions}`);
      if (item.materials) console.log(`  Materials: ${item.materials}`);
      if (item.description && item.description !== item.title) {
        console.log(`  Description: ${item.description.slice(0, 120)}`);
      }
      console.log("");
    }
  }
  console.log("=".repeat(60));
  console.log("NEXT: Review items, then import via Excel script or Supabase admin.");
  console.log("For Excel source use: npm run furniture:analyze");
  console.log("=".repeat(60));
}
