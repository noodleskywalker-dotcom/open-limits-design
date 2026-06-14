#!/usr/bin/env node
/**
 * Analyze furniture PDF — DOES NOT IMPORT.
 *
 * Reads AHMED SALAH data.pdf (or path argument) and outputs a full analysis report.
 *
 * Usage:
 *   npm run furniture:analyze-pdf
 *   node scripts/analyze-furniture-pdf.mjs "AHMED SALAH data.pdf"
 *   node scripts/analyze-furniture-pdf.mjs --json path/to/file.pdf
 *   node scripts/analyze-furniture-pdf.mjs --save-images "AHMED SALAH data.pdf"
 */
import {
  analyzeFurniturePdf,
  formatPdfAnalysisReport,
  resolvePdfPath
} from "../lib/furniture/pdf-analyze.mjs";

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const saveImages = args.includes("--save-images");
const inputPath = args.find((arg) => !arg.startsWith("--")) ?? null;

const filePath = resolvePdfPath(inputPath);

if (!filePath) {
  console.error("PDF file not found.");
  console.error("");
  console.error("Expected file: AHMED SALAH data.pdf");
  console.error("Place it in the project root, or pass a path:");
  console.error('  node scripts/analyze-furniture-pdf.mjs "AHMED SALAH data.pdf"');
  console.error("");
  console.error("Windows example (from Downloads):");
  console.error('  node scripts/analyze-furniture-pdf.mjs "C:\\Users\\Armani Adam\\Downloads\\AHMED SALAH data.pdf"');
  process.exit(1);
}

try {
  const report = await analyzeFurniturePdf(filePath, { saveImages });

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatPdfAnalysisReport(report));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
