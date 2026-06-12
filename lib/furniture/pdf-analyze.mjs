import fs from "node:fs";
import path from "node:path";

const NAME_KEYS = ["name", "title", "item", "product", "furniture", "piece", "arabic name", "english name"];
const CATEGORY_KEYS = ["category", "type", "group", "room type", "room", "classification"];
const DIMENSION_KEYS = ["dimension", "size", "wxd", "w x d", "measurements", "overall", "dimensions"];
const MATERIAL_KEYS = ["material", "fabric", "upholstery", "wood", "stone", "materials"];
const DESCRIPTION_KEYS = ["description", "details", "info", "notes", "spec", "remark", "remarks"];

export const DEFAULT_PDF_CANDIDATES = [
  "AHMED SALAH data.pdf",
  "AHMED-SALAH-data.pdf",
  "furniture-catalog.pdf",
  "ALI ALMOHANDI-FURNITURE.pdf"
];

export function resolvePdfPath(inputPath) {
  if (inputPath && fs.existsSync(inputPath)) return path.resolve(inputPath);
  for (const name of DEFAULT_PDF_CANDIDATES) {
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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function detectColumnIndex(headers, keys) {
  let best = -1;
  let bestScore = 0;
  for (let index = 0; index < headers.length; index += 1) {
    const normalized = normalizeKey(headers[index]);
    for (const key of keys) {
      if (normalized === key && 100 + key.length > bestScore) {
        best = index;
        bestScore = 100 + key.length;
      } else if (normalized.includes(key) && key.length > bestScore) {
        best = index;
        bestScore = key.length;
      }
    }
  }
  return best;
}

function pickCell(row, index) {
  if (index < 0 || index >= row.length) return null;
  const value = String(row[index] ?? "").trim();
  return value || null;
}

function formatDimensions(item) {
  if (item.dimensions?.trim()) return item.dimensions.trim();
  const parts = [item.width, item.depth, item.height].filter(Boolean);
  return parts.length ? parts.join(" × ") : null;
}

const DIMENSION_LINE =
  /(\d+[\d.,]*\s*[x×]\s*\d+[\d.,]*(?:\s*[x×]\s*\d+[\d.,]*)?\s*(?:cm|mm|m)?|\d+\s*cm|w\s*[:\.]?\s*\d|d\s*[:\.]?\s*\d|h\s*[:\.]?\s*\d)/i;
const MATERIAL_LINE = /material|fabric|upholstery|wood|marble|leather|velvet|brass|oak|stone|metal/i;

function buildItemFromFields(fields, pageNumber, source) {
  const title =
    fields.name ??
    fields.title ??
    fields.item ??
    fields.product ??
    fields.furniture ??
    fields.piece ??
    null;
  if (!title) return null;

  const item = {
    pageNumber,
    source,
    title,
    slug: slugify(title),
    category: fields.category ?? fields.type ?? fields.group ?? null,
    dimensions: fields.dimensions ?? fields.size ?? fields.measurements ?? null,
    width: fields.width ?? null,
    depth: fields.depth ?? fields.length ?? null,
    height: fields.height ?? null,
    materials: fields.materials ?? fields.material ?? fields.fabric ?? fields.upholstery ?? null,
    description: fields.description ?? fields.details ?? fields.notes ?? fields.spec ?? null,
    dimensionDisplay: null,
    matchedImages: [],
    missing: []
  };

  item.dimensionDisplay = formatDimensions(item);
  if (!item.category) item.missing.push("category");
  if (!item.dimensionDisplay) item.missing.push("dimensions");
  if (!item.materials) item.missing.push("materials");
  if (!item.description) item.missing.push("description");

  return item;
}

function parseLabeledText(text) {
  const fields = {};
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const labeled = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (labeled) {
      fields[normalizeKey(labeled[1])] = labeled[2].trim();
      continue;
    }

    if (!fields._title && line.length >= 3 && line.length <= 120 && !DIMENSION_LINE.test(line) && !MATERIAL_LINE.test(line)) {
      fields._title = line;
    } else if (DIMENSION_LINE.test(line) && !fields.dimensions) {
      fields.dimensions = line;
    } else if (MATERIAL_LINE.test(line) && !fields.materials) {
      fields.materials = line.replace(/^(materials?|fabric|upholstery)\s*[:\-]\s*/i, "");
    } else if (/^(sofa|majlis|chair|table|bed|dining|cabinet|light|bedroom|exterior|furniture)/i.test(line) && !fields.category) {
      fields.category = line;
    } else if (!fields.description && line.length > 10) {
      fields.description = fields.description ? `${fields.description} ${line}` : line;
    }
  }

  if (!fields.name && fields._title) fields.name = fields._title;
  return fields;
}

function parseTable(table, pageNumber) {
  if (!table?.length) return { items: [], mapping: null, headers: [] };

  const headers = table[0].map((cell) => String(cell ?? "").trim());
  const hasHeaderSignal = headers.some((header) =>
    [...NAME_KEYS, ...CATEGORY_KEYS, ...DIMENSION_KEYS, ...MATERIAL_KEYS].some((key) =>
      normalizeKey(header).includes(key)
    )
  );

  const mapping = hasHeaderSignal
    ? {
        name: detectColumnIndex(headers, NAME_KEYS),
        category: detectColumnIndex(headers, CATEGORY_KEYS),
        dimensions: detectColumnIndex(headers, DIMENSION_KEYS),
        materials: detectColumnIndex(headers, MATERIAL_KEYS),
        description: detectColumnIndex(headers, DESCRIPTION_KEYS)
      }
    : null;

  const startRow = mapping ? 1 : 0;
  const items = [];

  for (let rowIndex = startRow; rowIndex < table.length; rowIndex += 1) {
    const row = table[rowIndex];
    const title = mapping
      ? pickCell(row, mapping.name >= 0 ? mapping.name : 0)
      : pickCell(row, 0);
    if (!title) continue;

    const item = {
      pageNumber,
      source: "table",
      title,
      slug: slugify(title),
      category: mapping ? pickCell(row, mapping.category) : pickCell(row, 1),
      dimensions: mapping ? pickCell(row, mapping.dimensions) : pickCell(row, 2),
      width: null,
      depth: null,
      height: null,
      materials: mapping ? pickCell(row, mapping.materials) : pickCell(row, 3),
      description: mapping ? pickCell(row, mapping.description) : pickCell(row, 4),
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
  }

  return { items, mapping, headers };
}

async function loadPdfParse() {
  const { PDFParse } = await import("pdf-parse");
  return PDFParse;
}

function summarizeImages(imageResult) {
  const embeddedImages = [];
  for (const page of imageResult.pages ?? []) {
    for (let index = 0; index < (page.images ?? []).length; index += 1) {
      const image = page.images[index];
      embeddedImages.push({
        pageNumber: page.pageNumber,
        index,
        width: image.width ?? null,
        height: image.height ?? null,
        bytes: image.imageBuffer?.length ?? image.data?.length ?? 0,
        kind: image.kind ?? "embedded"
      });
    }
  }
  return embeddedImages;
}

function matchImagesToItems(items, embeddedImages) {
  const byPage = new Map();
  for (const image of embeddedImages) {
    if (!byPage.has(image.pageNumber)) byPage.set(image.pageNumber, []);
    byPage.get(image.pageNumber).push(image);
  }

  for (const item of items) {
    const pageImages = byPage.get(item.pageNumber) ?? [];
    item.matchedImages = pageImages.map((image) => ({
      pageNumber: image.pageNumber,
      index: image.index,
      width: image.width,
      height: image.height,
      bytes: image.bytes
    }));
  }

  const matchedCount = items.filter((item) => item.matchedImages.length > 0).length;
  const unmatchedPages = [...byPage.entries()]
    .filter(([pageNumber]) => !items.some((item) => item.pageNumber === pageNumber))
    .map(([pageNumber, images]) => ({ pageNumber, imageCount: images.length }));

  return { matchedCount, unmatchedPages };
}

async function saveExtractedImages(imageResult, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const saved = [];
  for (const page of imageResult.pages ?? []) {
    for (let index = 0; index < (page.images ?? []).length; index += 1) {
      const image = page.images[index];
      if (!image?.imageBuffer?.length) continue;
      const fileName = `page-${page.pageNumber}-image-${index + 1}.png`;
      const dest = path.join(outputDir, fileName);
      fs.writeFileSync(dest, image.imageBuffer);
      saved.push({
        pageNumber: page.pageNumber,
        index,
        width: image.width ?? null,
        height: image.height ?? null,
        bytes: image.imageBuffer.length,
        fileName,
        path: dest
      });
    }
  }
  return saved;
}

/**
 * @param {string | Buffer} source
 * @param {{ saveImages?: boolean, imageOutputDir?: string }} [options]
 */
export async function analyzeFurniturePdf(source, options = {}) {
  const PDFParse = await loadPdfParse();
  const filePath = typeof source === "string" ? source : null;
  const buffer =
    typeof source === "string" ? fs.readFileSync(source) : Buffer.isBuffer(source) ? source : Buffer.from(source);

  const parser = new PDFParse({ data: buffer });
  await parser.load();

  const info = await parser.getInfo();
  const textResult = await parser.getText();
  const tableResult = await parser.getTable();
  const imageResult = await parser.getImage({
    imageThreshold: 50,
    imageDataUrl: false,
    imageBuffer: true
  });

  const pageReports = [];
  const allItems = [];

  for (const pageText of textResult.pages ?? []) {
    const pageNumber = pageText.num;
    const pageTables = tableResult.pages.find((page) => page.num === pageNumber)?.tables ?? [];
    let pageItems = [];
    let tableMapping = null;
    let tableHeaders = [];

    for (const table of pageTables) {
      const parsed = parseTable(table, pageNumber);
      if (parsed.items.length) {
        pageItems.push(...parsed.items);
        tableMapping = parsed.mapping;
        tableHeaders = parsed.headers;
      }
    }

    if (!pageItems.length) {
      const fields = parseLabeledText(pageText.text ?? "");
      const item = buildItemFromFields(fields, pageNumber, "page-text");
      if (item) pageItems = [item];
    }

    pageReports.push({
      pageNumber,
      textLength: (pageText.text ?? "").length,
      textPreview: (pageText.text ?? "").slice(0, 240),
      tableCount: pageTables.length,
      tableHeaders,
      tableMapping,
      itemCount: pageItems.length,
      items: pageItems
    });

    allItems.push(...pageItems);
  }

  const embeddedImages = summarizeImages(imageResult);
  const { matchedCount, unmatchedPages } = matchImagesToItems(allItems, embeddedImages);

  let savedImages = [];
  if (options.saveImages && embeddedImages.length) {
    const outputDir =
      options.imageOutputDir ?? path.join(process.cwd(), "artifacts", "furniture-pdf-analysis", "images");
    savedImages = await saveExtractedImages(imageResult, outputDir);
  }

  await parser.destroy();

  const categories = [...new Set(allItems.map((item) => item.category).filter(Boolean))].sort();
  const materials = [...new Set(allItems.map((item) => item.materials).filter(Boolean))].sort();
  const dimensions = [...new Set(allItems.map((item) => item.dimensionDisplay).filter(Boolean))].sort();

  const rowsMissingData = allItems.filter((item) => item.missing.length > 0);
  const unclearMappings = [];
  if (!allItems.length) {
    unclearMappings.push("No furniture rows detected — PDF may be image-only or use an unsupported layout.");
  }
  if (embeddedImages.length && matchedCount === 0) {
    unclearMappings.push(
      `${embeddedImages.length} image(s) found but none matched parsed furniture rows — manual mapping may be required.`
    );
  }

  const imageMappingStatus =
    embeddedImages.length === 0
      ? "No embedded images detected in PDF pages."
      : matchedCount === 0
        ? `${embeddedImages.length} image(s) found across ${new Set(embeddedImages.map((i) => i.pageNumber)).size} page(s), but none linked to parsed items.`
        : `${matchedCount} of ${allItems.length} item(s) have images on the same page (${embeddedImages.length} total image(s)).`;

  return {
    filePath: filePath ?? "(buffer)",
    fileName: filePath ? path.basename(filePath) : "uploaded.pdf",
    pageCount: textResult.total ?? info.total ?? textResult.pages?.length ?? 0,
    textLength: textResult.text?.length ?? 0,
    furnitureItemCount: allItems.length,
    embeddedImageCount: embeddedImages.length,
    imageMatchedItemCount: matchedCount,
    imageUnmatchedPageCount: unmatchedPages.length,
    imageMappingStatus,
    pages: pageReports,
    categories,
    materials,
    dimensions,
    examples: allItems.slice(0, 10),
    rowsMissingData: rowsMissingData.slice(0, 20),
    rowsMissingDataCount: rowsMissingData.length,
    unclearMappings,
    embeddedImages,
    unmatchedImagePages: unmatchedPages,
    savedImages,
    textPreview: textResult.text?.slice(0, 2000) ?? ""
  };
}

export function formatPdfAnalysisReport(report) {
  const lines = [];
  lines.push("=".repeat(60));
  lines.push("FURNITURE PDF ANALYSIS REPORT");
  lines.push("=".repeat(60));
  lines.push(`File: ${report.fileName}`);
  lines.push(`Path: ${report.filePath}`);
  lines.push("");
  lines.push("IMPORT STATUS: ANALYSIS ONLY — nothing imported.");
  lines.push("");

  lines.push("--- DOCUMENT ---");
  lines.push(`Pages: ${report.pageCount}`);
  lines.push(`Extracted text length: ${report.textLength} characters`);
  lines.push(`Furniture items detected: ${report.furnitureItemCount}`);
  lines.push("");

  lines.push("--- PAGES ---");
  for (const page of report.pages) {
    lines.push(
      `  Page ${page.pageNumber}: ${page.itemCount} item(s), ${page.tableCount} table(s), ${page.textLength} chars`
    );
  }
  lines.push("");

  lines.push("--- DETECTED FIELDS (per page) ---");
  for (const page of report.pages) {
    if (!page.itemCount && !page.tableHeaders.length) continue;
    lines.push(`[Page ${page.pageNumber}]`);
    if (page.tableHeaders.length) {
      lines.push(`  Table headers: ${page.tableHeaders.join(" | ")}`);
    }
    if (page.tableMapping) {
      lines.push(
        `  Mapping: name=${page.tableMapping.name} category=${page.tableMapping.category} dimensions=${page.tableMapping.dimensions} materials=${page.tableMapping.materials} description=${page.tableMapping.description}`
      );
    }
    if (page.textPreview) {
      lines.push(`  Text preview: ${page.textPreview.replace(/\s+/g, " ").slice(0, 160)}…`);
    }
    lines.push("");
  }

  lines.push("--- EMBEDDED IMAGES ---");
  lines.push(`Total images: ${report.embeddedImageCount}`);
  lines.push(`Items with page-matched images: ${report.imageMatchedItemCount}`);
  lines.push(`Status: ${report.imageMappingStatus}`);
  lines.push("");

  if (report.embeddedImages.length) {
    lines.push("Images by page:");
    for (const image of report.embeddedImages) {
      lines.push(
        `  - Page ${image.pageNumber}, image ${image.index + 1}: ${image.width ?? "?"}×${image.height ?? "?"} px (${image.bytes} bytes)`
      );
    }
    lines.push("");
  }

  if (report.unmatchedImagePages.length) {
    lines.push("Pages with images but no parsed furniture row:");
    for (const entry of report.unmatchedImagePages) {
      lines.push(`  - Page ${entry.pageNumber}: ${entry.imageCount} image(s)`);
    }
    lines.push("");
  }

  if (report.savedImages.length) {
    lines.push("Extracted image files (analysis preview only):");
    for (const image of report.savedImages) {
      lines.push(`  - ${image.path}`);
    }
    lines.push("");
  }

  lines.push("--- SUMMARY ---");
  lines.push(`Furniture items found: ${report.furnitureItemCount}`);
  lines.push(
    `Categories (${report.categories.length}): ${report.categories.length ? report.categories.join(", ") : "(none detected)"}`
  );
  lines.push(
    `Materials (${report.materials.length}): ${report.materials.length ? report.materials.slice(0, 20).join(", ") : "(none detected)"}${report.materials.length > 20 ? "…" : ""}`
  );
  lines.push(
    `Dimensions (${report.dimensions.length}): ${report.dimensions.length ? report.dimensions.slice(0, 15).join(" | ") : "(none detected)"}${report.dimensions.length > 15 ? "…" : ""}`
  );
  lines.push(`Image count: ${report.embeddedImageCount}`);
  lines.push("");

  lines.push("--- FIRST 10 FURNITURE ITEMS ---");
  if (!report.examples.length) {
    lines.push("(no furniture rows detected — see text preview below)");
    if (report.textPreview) {
      lines.push("");
      lines.push(report.textPreview.slice(0, 1500));
    }
  }
  for (const item of report.examples) {
    lines.push(`Page ${item.pageNumber} [${item.source}] ${item.title}`);
    if (item.category) lines.push(`  Category: ${item.category}`);
    if (item.dimensionDisplay) lines.push(`  Dimensions: ${item.dimensionDisplay}`);
    if (item.materials) lines.push(`  Materials: ${item.materials}`);
    if (item.description) {
      lines.push(`  Description: ${item.description.slice(0, 120)}${item.description.length > 120 ? "…" : ""}`);
    }
    if (item.matchedImages?.length) {
      lines.push(`  Images: ${item.matchedImages.length} on same page`);
    }
    if (item.missing.length) lines.push(`  Missing: ${item.missing.join(", ")}`);
    lines.push("");
  }

  if (report.rowsMissingDataCount) {
    lines.push(`--- ROWS MISSING DATA (${report.rowsMissingDataCount}) ---`);
    for (const item of report.rowsMissingData.slice(0, 10)) {
      lines.push(`  Page ${item.pageNumber} ${item.title}: ${item.missing.join(", ")}`);
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
  lines.push("=".repeat(60));

  return lines.join("\n");
}
