import fs from "node:fs";
import path from "node:path";

const NAME_KEYS = ["name", "title", "item", "product", "furniture", "piece", "arabic name", "english name"];
const CATEGORY_KEYS = ["category", "type", "group", "room type", "room", "classification"];
const DIMENSION_KEYS = ["dimension", "size", "wxd", "w x d", "measurements", "overall"];
const MATERIAL_KEYS = ["material", "fabric", "upholstery", "wood", "stone", "materials"];
const FINISH_KEYS = ["finish", "color", "colour", "finishes"];
const DESCRIPTION_KEYS = ["description", "details", "info", "notes", "spec", "remark", "remarks"];
const COLLECTION_KEYS = ["collection", "set", "suite", "bedroom", "room set"];
const WIDTH_KEYS = ["width", "w ", "w("];
const DEPTH_KEYS = ["depth", "length", "d ", "l("];
const HEIGHT_KEYS = ["height", "h ", "h("];

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

/** Return best match and all candidate columns for a field type. */
function detectColumns(columns, keys) {
  const candidates = [];
  let best = null;
  let bestScore = 0;

  for (const column of columns) {
    const normalized = normalizeKey(column);
    for (const key of keys) {
      if (normalized === key) {
        candidates.push({ column, score: 100 + key.length });
        if (100 + key.length > bestScore) {
          best = column;
          bestScore = 100 + key.length;
        }
      } else if (normalized.includes(key)) {
        candidates.push({ column, score: key.length });
        if (key.length > bestScore) {
          best = column;
          bestScore = key.length;
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const unique = [...new Map(candidates.map((c) => [c.column, c])).values()];
  return { best, candidates: unique.map((c) => c.column) };
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

function formatDimensions(item) {
  if (item.dimensions?.trim()) return item.dimensions.trim();
  const parts = [item.width, item.depth, item.height].filter(Boolean);
  return parts.length ? parts.join(" × ") : null;
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
  const oneCellBlocks = xml.match(/<xdr:oneCellAnchor[\s\S]*?<\/xdr:oneCellAnchor>/g) ?? [];
  const allBlocks = [...anchorBlocks, ...oneCellBlocks];

  for (const block of allBlocks) {
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

async function buildSheetDrawingMap(zip) {
  const map = new Map();
  for (const entry of Object.keys(zip.files)) {
    if (!/^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/i.test(entry)) continue;
    const xml = await zip.files[entry].async("string");
    const match = xml.match(/Target="(\.\.\/drawings\/drawing\d+\.xml)"/i);
    if (!match) continue;
    const sheetKey = entry.replace("xl/worksheets/_rels/", "").replace(".xml.rels", "");
    const drawingPath = match[1].replace(/^\.\.\//, "xl/");
    map.set(sheetKey, drawingPath);
  }
  return map;
}

function excelRowFromAnchor(fromRow) {
  return fromRow + 1;
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

  const sheetDrawingMap = await buildSheetDrawingMap(zip);

  const sheetReports = [];
  let totalRows = 0;
  const allItems = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    const columns = rows.length ? Object.keys(rows[0]) : [];
    totalRows += rows.length;

    const nameDetect = detectColumns(columns, NAME_KEYS);
    const categoryDetect = detectColumns(columns, CATEGORY_KEYS);
    const dimensionDetect = detectColumns(columns, DIMENSION_KEYS);
    const materialDetect = detectColumns(columns, MATERIAL_KEYS);
    const descriptionDetect = detectColumns(columns, DESCRIPTION_KEYS);

    const mapping = {
      name: nameDetect.best,
      category: categoryDetect.best,
      dimensions: dimensionDetect.best,
      materials: materialDetect.best,
      finishes: detectColumns(columns, FINISH_KEYS).best,
      description: descriptionDetect.best,
      collection: detectColumns(columns, COLLECTION_KEYS).best,
      width: detectColumns(columns, WIDTH_KEYS).best,
      depth: detectColumns(columns, DEPTH_KEYS).best,
      height: detectColumns(columns, HEIGHT_KEYS).best
    };

    const detectedColumns = {
      name: nameDetect.candidates,
      category: categoryDetect.candidates,
      dimensions: dimensionDetect.candidates,
      materials: materialDetect.candidates,
      description: descriptionDetect.candidates
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
        dimensionDisplay: null,
        matchedImages: [],
        missing: []
      };

      item.dimensionDisplay = formatDimensions(item);

      if (!item.category) item.missing.push("category");
      if (!item.dimensionDisplay) item.missing.push("dimensions");
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
      detectedColumns,
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
        excelRow: excelRowFromAnchor(anchor.fromRow),
        excelCol: anchor.fromCol + 1,
        mediaPath: mediaTarget ?? null
      });
    }
  }

  const imageToRowMatches = [];
  const unmatchedImages = [...embeddedImages];

  for (const sheet of sheetReports) {
    const sheetKey = workbook.SheetNames.indexOf(sheet.sheetName);
    const sheetFile = `sheet${sheetKey + 1}`;
    const drawingPath = sheetDrawingMap.get(sheetFile);
    if (!drawingPath) continue;

    const anchorsForSheet = imageAnchors.filter((a) => a.drawingPath === drawingPath);
    for (const anchor of anchorsForSheet) {
      if (!anchor.mediaPath) continue;

      const item =
        sheet.items.find((entry) => entry.rowNumber === anchor.excelRow) ??
        sheet.items.find((entry) => Math.abs(entry.rowNumber - anchor.excelRow) <= 1);

      const media = embeddedImages.find((img) => img.path === anchor.mediaPath);
      const match = {
        sheetName: sheet.sheetName,
        excelRow: anchor.excelRow,
        excelCol: anchor.excelCol,
        mediaPath: anchor.mediaPath,
        fileName: media?.fileName ?? path.basename(anchor.mediaPath),
        furnitureTitle: item?.title ?? null,
        furnitureRow: item?.rowNumber ?? null,
        matched: Boolean(item)
      };

      imageToRowMatches.push(match);

      if (item) {
        item.matchedImages.push({
          mediaPath: anchor.mediaPath,
          fileName: match.fileName
        });
        const idx = unmatchedImages.findIndex((img) => img.path === anchor.mediaPath);
        if (idx >= 0) unmatchedImages.splice(idx, 1);
      }
    }
  }

  const categories = [...new Set(allItems.map((item) => item.category).filter(Boolean))].sort();
  const materials = [...new Set(allItems.map((item) => item.materials).filter(Boolean))].sort();
  const dimensions = [...new Set(allItems.map((item) => item.dimensionDisplay).filter(Boolean))].sort();
  const collections = [...new Set(allItems.map((item) => item.collection).filter(Boolean))].sort();

  const rowsMissingData = allItems.filter((item) => item.missing.length > 0);
  const unclearMappings = [];

  for (const sheet of sheetReports) {
    if (!sheet.mapping.name) unclearMappings.push(`${sheet.sheetName}: no name/title column detected`);
    if (sheet.itemCount > 0 && !sheet.mapping.category) {
      unclearMappings.push(`${sheet.sheetName}: category column unclear — fallback category would be used on import`);
    }
    if (sheet.itemCount > 0 && !sheet.mapping.materials) {
      unclearMappings.push(`${sheet.sheetName}: materials column not detected`);
    }
    if (sheet.itemCount > 0 && !sheet.mapping.dimensions && !sheet.mapping.width) {
      unclearMappings.push(`${sheet.sheetName}: dimensions column not detected`);
    }
  }

  const matchedCount = imageToRowMatches.filter((m) => m.matched).length;
  const imageMappingStatus =
    embeddedImages.length === 0
      ? "No embedded images found in xl/media/"
      : imageAnchors.length === 0
        ? `${embeddedImages.length} embedded image(s) in xl/media/ but no drawing anchors — images cannot be auto-mapped to rows`
        : matchedCount === 0
          ? `${embeddedImages.length} image(s) and ${imageAnchors.length} anchor(s) found, but none matched furniture rows — manual mapping required`
          : `${matchedCount} of ${embeddedImages.length} image(s) matched to furniture rows via drawing anchors`;

  return {
    filePath: filePath ?? "(buffer)",
    fileName: filePath ? path.basename(filePath) : "uploaded.xlsx",
    sheetNames: workbook.SheetNames,
    sheetRowCounts: sheetReports.map((s) => ({ sheetName: s.sheetName, rowCount: s.rowCount, itemCount: s.itemCount })),
    totalRows,
    furnitureItemCount: allItems.length,
    embeddedImageCount: embeddedImages.length,
    imageAnchorCount: imageAnchors.length,
    imageMatchedCount: matchedCount,
    imageUnmatchedCount: unmatchedImages.length,
    imageMappingStatus,
    sheets: sheetReports,
    categories,
    materials,
    dimensions,
    collections,
    examples: allItems.slice(0, 10),
    rowsMissingData: rowsMissingData.slice(0, 20),
    rowsMissingDataCount: rowsMissingData.length,
    unclearMappings,
    embeddedImages: embeddedImages.map(({ path: mediaPath, fileName, bytes, mimeType }) => ({
      path: mediaPath,
      fileName,
      bytes,
      mimeType
    })),
    imageAnchors,
    imageToRowMatches,
    unmatchedImages: unmatchedImages.map(({ path: mediaPath, fileName, bytes }) => ({
      path: mediaPath,
      fileName,
      bytes
    }))
  };
}

function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".emf") return "image/emf";
  if (ext === ".wmf") return "image/wmf";
  return "application/octet-stream";
}

export function formatAnalysisReport(report) {
  const lines = [];
  lines.push("=".repeat(60));
  lines.push("FURNITURE EXCEL ANALYSIS REPORT");
  lines.push("=".repeat(60));
  lines.push(`File: ${report.fileName}`);
  lines.push(`Path: ${report.filePath}`);
  lines.push("");
  lines.push("IMPORT STATUS: ANALYSIS ONLY — nothing imported.");
  lines.push("");

  lines.push("--- SHEETS ---");
  lines.push(`Sheet names (${report.sheetNames.length}): ${report.sheetNames.join(", ") || "(none)"}`);
  lines.push("");
  for (const sheet of report.sheetRowCounts) {
    lines.push(`  ${sheet.sheetName}: ${sheet.rowCount} rows, ${sheet.itemCount} furniture item(s)`);
  }
  lines.push(`Total rows (all sheets): ${report.totalRows}`);
  lines.push("");

  lines.push("--- DETECTED COLUMNS (per sheet) ---");
  for (const sheet of report.sheets) {
    lines.push(`[${sheet.sheetName}]`);
    lines.push(`  All columns: ${sheet.columns.join(" | ") || "(none)"}`);
    lines.push(`  Name column: ${sheet.mapping.name ?? "(not detected)"}`);
    if (sheet.detectedColumns.name.length > 1) {
      lines.push(`    candidates: ${sheet.detectedColumns.name.join(", ")}`);
    }
    lines.push(`  Category column: ${sheet.mapping.category ?? "(not detected)"}`);
    if (sheet.detectedColumns.category.length > 1) {
      lines.push(`    candidates: ${sheet.detectedColumns.category.join(", ")}`);
    }
    lines.push(`  Material column: ${sheet.mapping.materials ?? "(not detected)"}`);
    if (sheet.detectedColumns.materials.length > 1) {
      lines.push(`    candidates: ${sheet.detectedColumns.materials.join(", ")}`);
    }
    lines.push(`  Dimension column: ${sheet.mapping.dimensions ?? "(not detected)"}`);
    if (sheet.mapping.width || sheet.mapping.depth || sheet.mapping.height) {
      lines.push(
        `    W/D/H: ${[sheet.mapping.width, sheet.mapping.depth, sheet.mapping.height].filter(Boolean).join(" / ") || "—"}`
      );
    }
    lines.push(`  Description column: ${sheet.mapping.description ?? "(not detected)"}`);
    lines.push("");
  }

  lines.push("--- EMBEDDED IMAGES (xl/media) ---");
  lines.push(`Total images in xl/media/: ${report.embeddedImageCount}`);
  lines.push(`Drawing anchors found: ${report.imageAnchorCount}`);
  lines.push(`Matched to furniture rows: ${report.imageMatchedCount}`);
  lines.push(`Unmatched images: ${report.imageUnmatchedCount}`);
  lines.push(`Status: ${report.imageMappingStatus}`);
  lines.push("");

  if (report.embeddedImages.length) {
    lines.push("Media files:");
    for (const img of report.embeddedImages) {
      lines.push(`  - ${img.path} (${img.bytes} bytes, ${img.mimeType})`);
    }
    lines.push("");
  }

  if (report.imageToRowMatches.length) {
    lines.push("Image → row matching attempts:");
    for (const match of report.imageToRowMatches) {
      lines.push(
        `  - ${match.fileName} @ row ${match.excelRow}, col ${match.excelCol} [${match.sheetName}]` +
          (match.matched ? ` → "${match.furnitureTitle}" (row ${match.furnitureRow})` : " → NO MATCH")
      );
    }
    lines.push("");
  }

  if (report.unmatchedImages.length) {
    lines.push("Unmatched xl/media images:");
    for (const img of report.unmatchedImages) {
      lines.push(`  - ${img.path} (${img.bytes} bytes)`);
    }
    lines.push("");
  }

  lines.push("--- SUMMARY ---");
  lines.push(`Furniture items found: ${report.furnitureItemCount}`);
  lines.push(`Categories (${report.categories.length}): ${report.categories.length ? report.categories.join(", ") : "(none detected)"}`);
  lines.push(
    `Materials (${report.materials.length}): ${report.materials.length ? report.materials.slice(0, 20).join(", ") : "(none detected)"}${report.materials.length > 20 ? "…" : ""}`
  );
  lines.push(
    `Dimensions (${report.dimensions.length}): ${report.dimensions.length ? report.dimensions.slice(0, 15).join(" | ") : "(none detected)"}${report.dimensions.length > 15 ? "…" : ""}`
  );
  lines.push(`Image count: ${report.embeddedImageCount}`);
  if (report.collections.length) {
    lines.push(`Collections: ${report.collections.join(", ")}`);
  }
  lines.push("");

  lines.push("--- FIRST 10 FURNITURE ITEMS ---");
  if (!report.examples.length) {
    lines.push("(no furniture rows detected — check name column mapping)");
  }
  for (const item of report.examples) {
    lines.push(`Row ${item.rowNumber} [${item.sheetName}] ${item.title}`);
    if (item.category) lines.push(`  Category: ${item.category}`);
    if (item.dimensionDisplay) lines.push(`  Dimensions: ${item.dimensionDisplay}`);
    if (item.materials) lines.push(`  Materials: ${item.materials}`);
    if (item.finishes) lines.push(`  Finishes: ${item.finishes}`);
    if (item.description) lines.push(`  Description: ${item.description.slice(0, 120)}${item.description.length > 120 ? "…" : ""}`);
    if (item.collection) lines.push(`  Collection: ${item.collection}`);
    if (item.matchedImages?.length) {
      lines.push(`  Images: ${item.matchedImages.map((img) => img.fileName).join(", ")}`);
    }
    if (item.missing.length) lines.push(`  Missing: ${item.missing.join(", ")}`);
    lines.push("");
  }

  if (report.rowsMissingDataCount) {
    lines.push(`--- ROWS MISSING DATA (${report.rowsMissingDataCount}) ---`);
    for (const item of report.rowsMissingData.slice(0, 10)) {
      lines.push(`  Row ${item.rowNumber} ${item.title}: ${item.missing.join(", ")}`);
    }
    lines.push("");
  }

  if (report.unclearMappings.length) {
    lines.push("--- WARNINGS ---");
    report.unclearMappings.forEach((line) => lines.push(`  - ${line}`));
    lines.push("");
  }

  lines.push("=".repeat(60));
  lines.push("NEXT STEP: Review and approve this report before any import.");
  lines.push("Import is NOT run by this script.");
  lines.push("After approval, import can be enabled separately.");
  lines.push("=".repeat(60));

  return lines.join("\n");
}
