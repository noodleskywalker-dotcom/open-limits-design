import fs from "node:fs";
import path from "node:path";

const NAME_KEYS = ["name", "title", "item", "product", "furniture", "piece"];
const CATEGORY_KEYS = ["category", "type", "group", "room type", "room"];
const DIMENSION_KEYS = ["dimension", "size", "wxd", "w x d", "measurements"];
const MATERIAL_KEYS = ["material", "fabric", "upholstery", "wood", "stone"];
const FINISH_KEYS = ["finish", "color", "colour", "finishes"];
const DESCRIPTION_KEYS = ["description", "details", "info", "notes", "spec"];
const COLLECTION_KEYS = ["collection", "set", "suite", "bedroom", "room set"];
const WIDTH_KEYS = ["width", "w "];
const DEPTH_KEYS = ["depth", "length", "d "];
const HEIGHT_KEYS = ["height", "h "];

export const DEFAULT_XLSX_CANDIDATES = [
  "AHMED SALAH data.xlsx",
  "AHMED-SALAH-data.xlsx",
  "ALI ALMOHANDI-FURNITURE.xlsx"
];

export function resolveExcelPath(inputPath) {
  if (inputPath && fs.existsSync(inputPath)) return path.resolve(inputPath);
  for (const name of DEFAULT_XLSX_CANDIDATES) {
    const candidate = path.join(process.cwd(), name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function normalizeKey(key) {
  return String(key ?? "")
    .trim()
    .toLowerCase();
}

function scoreColumn(columns, keys) {
  let best = null;
  let bestScore = 0;
  for (const column of columns) {
    const normalized = normalizeKey(column);
    for (const key of keys) {
      if (normalized === key) {
        return column;
      }
      if (normalized.includes(key) && key.length > bestScore) {
        best = column;
        bestScore = key.length;
      }
    }
  }
  return best;
}

function pickValue(row, column) {
  if (!column) return null;
  const value = row[column];
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadXlsx() {
  try {
    return (await import("xlsx")).default;
  } catch {
    throw new Error("The xlsx package is not installed. Run: npm install xlsx");
  }
}

async function loadJszip() {
  try {
    return (await import("jszip")).default;
  } catch {
    throw new Error("The jszip package is not installed. Run: npm install jszip");
  }
}

function parseDrawingAnchors(xml) {
  const anchors = [];
  const anchorBlocks = xml.match(/<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g) ?? [];
  for (const block of anchorBlocks) {
    const fromRow = Number(block.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)?.[1] ?? -1);
    const fromCol = Number(block.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/)?.[1] ?? -1);
    const embed = block.match(/r:embed="([^"]+)"/)?.[1] ?? null;
    if (embed) anchors.push({ fromRow, fromCol, embed });
  }
  return anchors;
}

function parseDrawingRels(xml) {
  const map = new Map();
  const relBlocks = xml.match(/<Relationship[^>]+>/g) ?? [];
  for (const rel of relBlocks) {
    const id = rel.match(/Id="([^"]+)"/)?.[1];
    const target = rel.match(/Target="([^"]+)"/)?.[1];
    if (id && target) map.set(id, target.replace(/^\.\.\//, "xl/"));
  }
  return map;
}

/**
 * @param {string | Buffer} source - file path or buffer
 */
export async function analyzeFurnitureExcel(source) {
  const XLSX = await loadXlsx();
  const JSZip = await loadJszip();

  const filePath = typeof source === "string" ? source : null;
  const buffer =
    typeof source === "string" ? fs.readFileSync(source) : Buffer.isBuffer(source) ? source : Buffer.from(source);

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const zip = await JSZip.loadAsync(buffer);

  const zipEntries = Object.keys(zip.files);
  const mediaFiles = zipEntries.filter((name) => /^xl\/media\//i.test(name) && !name.endsWith("/"));
  const drawingFiles = zipEntries.filter((name) => /^xl\/drawings\/drawing\d+\.xml$/i.test(name));

  const embeddedImages = [];
  for (const mediaPath of mediaFiles) {
    const file = zip.files[mediaPath];
    const data = await file.async("nodebuffer");
    embeddedImages.push({
      path: mediaPath,
      fileName: path.basename(mediaPath),
      bytes: data.length,
      mimeType: guessMime(mediaPath)
    });
  }

  const sheetReports = [];
  let totalRows = 0;
  const allItems = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    const columns = rows.length ? Object.keys(rows[0]) : [];
    totalRows += rows.length;

    const mapping = {
      name: scoreColumn(columns, NAME_KEYS),
      category: scoreColumn(columns, CATEGORY_KEYS),
      dimensions: scoreColumn(columns, DIMENSION_KEYS),
      materials: scoreColumn(columns, MATERIAL_KEYS),
      finishes: scoreColumn(columns, FINISH_KEYS),
      description: scoreColumn(columns, DESCRIPTION_KEYS),
      collection: scoreColumn(columns, COLLECTION_KEYS),
      width: scoreColumn(columns, WIDTH_KEYS),
      depth: scoreColumn(columns, DEPTH_KEYS),
      height: scoreColumn(columns, HEIGHT_KEYS)
    };

    const items = [];
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const title = pickValue(row, mapping.name);
      if (!title) continue;

      const item = {
        rowNumber: index + 2,
        sheetName,
        title,
        slug: slugify(title),
        category: pickValue(row, mapping.category),
        dimensions: pickValue(row, mapping.dimensions),
        materials: pickValue(row, mapping.materials),
        finishes: pickValue(row, mapping.finishes),
        description: pickValue(row, mapping.description),
        collection: pickValue(row, mapping.collection),
        width: pickValue(row, mapping.width),
        depth: pickValue(row, mapping.depth),
        height: pickValue(row, mapping.height),
        missing: []
      };

      if (!item.category) item.missing.push("category");
      if (!item.dimensions && !(item.width && item.depth && item.height)) item.missing.push("dimensions");
      if (!item.materials) item.missing.push("materials");
      if (!item.description) item.missing.push("description");

      items.push(item);
      allItems.push(item);
    }

    sheetReports.push({
      sheetName,
      rowCount: rows.length,
      itemCount: items.length,
      columns,
      mapping,
      items
    });
  }

  const imageAnchors = [];
  for (const drawingPath of drawingFiles) {
    const drawingXml = await zip.files[drawingPath].async("string");
    const relsPath = drawingPath.replace("drawings/", "drawings/_rels/") + ".rels";
    const relsXml = zip.files[relsPath] ? await zip.files[relsPath].async("string") : "";
    const relMap = parseDrawingRels(relsXml);
    for (const anchor of parseDrawingAnchors(drawingXml)) {
      const mediaTarget = relMap.get(anchor.embed);
      imageAnchors.push({
        drawingPath,
        ...anchor,
        mediaPath: mediaTarget ?? null
      });
    }
  }

  const categories = [...new Set(allItems.map((item) => item.category).filter(Boolean))].sort();
  const materials = [...new Set(allItems.map((item) => item.materials).filter(Boolean))].sort();
  const collections = [...new Set(allItems.map((item) => item.collection).filter(Boolean))].sort();

  const rowsMissingData = allItems.filter((item) => item.missing.length > 0);
  const unclearMappings = [];

  for (const sheet of sheetReports) {
    if (!sheet.mapping.name) unclearMappings.push(`${sheet.sheetName}: no name/title column detected`);
    if (sheet.itemCount > 0 && !sheet.mapping.category) {
      unclearMappings.push(`${sheet.sheetName}: category column unclear — will use fallback on import`);
    }
  }

  const imageMappingStatus =
    embeddedImages.length === 0
      ? "No embedded images found in xl/media/"
      : imageAnchors.length === 0
        ? `${embeddedImages.length} embedded image(s) found but no drawing anchors — manual image mapping required`
        : `${embeddedImages.length} embedded image(s), ${imageAnchors.length} anchor(s) detected — partial row mapping possible`;

  return {
    filePath: filePath ?? "(buffer)",
    fileName: filePath ? path.basename(filePath) : "uploaded.xlsx",
    sheetNames: workbook.SheetNames,
    totalRows,
    furnitureItemCount: allItems.length,
    embeddedImageCount: embeddedImages.length,
    imageAnchorCount: imageAnchors.length,
    imageMappingStatus,
    sheets: sheetReports,
    categories,
    materials,
    collections,
    examples: allItems.slice(0, 5),
    rowsMissingData: rowsMissingData.slice(0, 20),
    rowsMissingDataCount: rowsMissingData.length,
    unclearMappings,
    embeddedImages: embeddedImages.map(({ path: mediaPath, fileName, bytes, mimeType }) => ({
      path: mediaPath,
      fileName,
      bytes,
      mimeType
    })),
    imageAnchors
  };
}

function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

export function formatAnalysisReport(report) {
  const lines = [];
  lines.push("=== FURNITURE EXCEL ANALYSIS ===");
  lines.push(`File: ${report.fileName}`);
  lines.push(`Sheets: ${report.sheetNames.join(", ")}`);
  lines.push(`Total rows: ${report.totalRows}`);
  lines.push(`Furniture items detected: ${report.furnitureItemCount}`);
  lines.push(`Embedded images: ${report.embeddedImageCount}`);
  lines.push(`Image anchors: ${report.imageAnchorCount}`);
  lines.push(`Image mapping: ${report.imageMappingStatus}`);
  lines.push("");

  for (const sheet of report.sheets) {
    lines.push(`--- Sheet: ${sheet.sheetName} (${sheet.rowCount} rows, ${sheet.itemCount} items) ---`);
    lines.push(`Columns: ${sheet.columns.join(" | ") || "(none)"}`);
    lines.push("Column mapping:");
    for (const [key, value] of Object.entries(sheet.mapping)) {
      lines.push(`  ${key}: ${value ?? "(not detected)"}`);
    }
    lines.push("");
  }

  if (report.categories.length) {
    lines.push(`Categories found (${report.categories.length}): ${report.categories.join(", ")}`);
  }
  if (report.materials.length) {
    lines.push(`Materials found (${report.materials.length}): ${report.materials.slice(0, 15).join(", ")}${report.materials.length > 15 ? "…" : ""}`);
  }
  if (report.collections.length) {
    lines.push(`Collections found: ${report.collections.join(", ")}`);
  }

  lines.push("");
  lines.push("Example items (first 5):");
  for (const item of report.examples) {
    lines.push(
      `- Row ${item.rowNumber} [${item.sheetName}] ${item.title}` +
        (item.category ? ` | ${item.category}` : "") +
        (item.dimensions ? ` | ${item.dimensions}` : "") +
        (item.materials ? ` | ${item.materials}` : "") +
        (item.missing.length ? ` | missing: ${item.missing.join(", ")}` : "")
    );
  }

  if (report.rowsMissingDataCount) {
    lines.push("");
    lines.push(`Rows missing important data: ${report.rowsMissingDataCount}`);
    for (const item of report.rowsMissingData.slice(0, 10)) {
      lines.push(`  Row ${item.rowNumber} ${item.title}: ${item.missing.join(", ")}`);
    }
  }

  if (report.unclearMappings.length) {
    lines.push("");
    lines.push("Unclear mappings:");
    report.unclearMappings.forEach((line) => lines.push(`  - ${line}`));
  }

  if (report.embeddedImages.length) {
    lines.push("");
    lines.push("Embedded media files:");
    report.embeddedImages.forEach((img) => lines.push(`  - ${img.path} (${img.bytes} bytes)`));
  }

  lines.push("");
  lines.push("NEXT STEP: Review this report. Import is blocked until you approve and run:");
  lines.push("  node scripts/import-furniture-from-excel.mjs --confirm [path-to-xlsx]");

  return lines.join("\n");
}
