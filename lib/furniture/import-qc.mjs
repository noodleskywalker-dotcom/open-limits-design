/**
 * Pre-import quality control: confidence scoring, category hierarchy,
 * SEO generation, duplicate detection, and import batch helpers.
 */

export const FURNITURE_ROOT = {
  slug: "furniture",
  name: "Furniture"
};

/** Canonical subcategories under Furniture (user-defined hierarchy). */
export const FURNITURE_SUBCATEGORIES = [
  { slug: "sofas", name: "Sofas", keywords: ["sofa", "sectional", "couch", "l-shaped"] },
  { slug: "majlis", name: "Majlis", keywords: ["majlis"] },
  { slug: "chairs", name: "Chairs", keywords: ["chair", "armchair", "stool", "pouf", "desk chair"] },
  { slug: "tables", name: "Tables", keywords: ["table", "coffee table", "console", "side table"] },
  { slug: "bedrooms", name: "Bedrooms", keywords: ["bedroom", "bed room", "nightstand", "wardrobe"] },
  { slug: "dining", name: "Dining", keywords: ["dining", "dinner"] },
  { slug: "outdoor", name: "Outdoor", keywords: ["outdoor", "exterior", "garden", "patio"] },
  { slug: "accessories", name: "Accessories", keywords: ["accessory", "accessories", "decor", "lighting", "lamp", "cabinet"] }
];

export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ensureUniqueSlugs(items) {
  const used = new Set();
  return items.map((item) => {
    let base = item.slug || slugify(item.title);
    if (!base) base = "item";
    let slug = base;
    let counter = 2;
    while (used.has(slug)) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    used.add(slug);
    return { ...item, slug };
  });
}

const DIMENSION_PATTERN =
  /(\d+[\d.,]*\s*[x×]\s*\d+[\d.,]*(?:\s*[x×]\s*\d+[\d.,]*)?\s*(?:cm|mm|m)?|\d+\s*cm|w\s*[:\.]?\s*\d|d\s*[:\.]?\s*\d|h\s*[:\.]?\s*\d)/i;
const MATERIAL_PATTERN =
  /material|fabric|upholstery|wood|marble|leather|velvet|brass|oak|stone|metal|linen|silk/i;

function clampConfidence(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreNameConfidence(item) {
  if (!item.title?.trim()) return 0;
  const title = item.title.trim();
  if (title.length < 3) return 35;
  if (item.source === "table") return clampConfidence(88 + Math.min(title.length / 20, 12));
  if (item.source === "page-text") return clampConfidence(55 + Math.min(title.length / 15, 25));
  return 70;
}

export function mapToHierarchyCategory(rawCategory, title) {
  const haystack = `${rawCategory ?? ""} ${title ?? ""}`.toLowerCase();

  for (const sub of FURNITURE_SUBCATEGORIES) {
    for (const keyword of sub.keywords) {
      if (haystack.includes(keyword)) {
        const exact = rawCategory && slugify(rawCategory) === sub.slug;
        const partial = rawCategory && rawCategory.toLowerCase().includes(sub.name.toLowerCase());
        const confidence = exact ? 95 : partial ? 85 : 72;
        return { name: sub.name, slug: sub.slug, confidence: clampConfidence(confidence) };
      }
    }
  }

  if (rawCategory?.trim()) {
    const slug = slugify(rawCategory);
    const known = FURNITURE_SUBCATEGORIES.find((entry) => entry.slug === slug);
    if (known) return { name: known.name, slug: known.slug, confidence: 90 };
    return { name: rawCategory.trim(), slug: slug || "accessories", confidence: 45 };
  }

  return { name: "Accessories", slug: "accessories", confidence: 30 };
}

export function scoreDimensionsConfidence(value) {
  if (!value?.trim()) return 0;
  const text = value.trim();
  if (DIMENSION_PATTERN.test(text)) return clampConfidence(85 + Math.min(text.length / 10, 15));
  if (/\d/.test(text)) return 50;
  return 35;
}

export function scoreMaterialsConfidence(value) {
  if (!value?.trim()) return 0;
  const text = value.trim();
  if (MATERIAL_PATTERN.test(text)) return clampConfidence(80 + Math.min(text.split(/\s+/).length * 2, 20));
  if (text.length > 8) return 55;
  return 40;
}

export function generateSeoTitle(title, categoryName) {
  const cleanTitle = String(title ?? "").trim();
  const cleanCategory = String(categoryName ?? "").trim();
  if (!cleanTitle) return "Open Limits Design — Custom Furniture";
  if (cleanCategory && cleanCategory !== "Furniture") {
    return `${cleanTitle} | ${cleanCategory} — Open Limits Design`;
  }
  return `${cleanTitle} — Open Limits Design Furniture`;
}

export function generateMetaDescription(title, categoryName, materials, dimensions) {
  const parts = [];
  const cleanTitle = String(title ?? "").trim();
  const cleanCategory = String(categoryName ?? "").trim();

  if (cleanTitle) {
    parts.push(
      `Discover ${cleanTitle}${cleanCategory && cleanCategory !== "Furniture" ? ` in our ${cleanCategory} collection` : ""} by Open Limits Design.`
    );
  } else {
    parts.push("Custom luxury furniture by Open Limits Design in Qatar.");
  }

  if (materials?.trim()) parts.push(`Materials: ${materials.trim().slice(0, 120)}.`);
  if (dimensions?.trim()) parts.push(`Dimensions: ${dimensions.trim().slice(0, 80)}.`);

  parts.push("Bespoke craftsmanship, premium finishes, worldwide delivery.");
  return parts.join(" ").slice(0, 320);
}

export function imageRefId(pageNumber, index) {
  return `${pageNumber}:${index}`;
}

function bufferToDataUrl(buffer, mime = "image/png") {
  if (!buffer?.length) return null;
  return `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
}

function detectMime(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
  if (buffer[8] === 0x57 && buffer[9] === 0x45) return "image/webp";
  return "image/png";
}

/**
 * @param {Map<string, { id: string, slug: string, title: string }>} existingBySlug
 */
export function enrichItemForQC(item, previewId, existingBySlug) {
  const dimensions = item.dimensionDisplay ?? item.dimensions ?? null;
  const mapped = mapToHierarchyCategory(item.category, item.title);
  const slug = item.slug || slugify(item.title);
  const existing = existingBySlug.get(slug) ?? null;

  const confidence = {
    name: scoreNameConfidence(item),
    category: mapped.confidence,
    dimensions: scoreDimensionsConfidence(dimensions),
    materials: scoreMaterialsConfidence(item.materials)
  };

  const categoryName = mapped.name;
  const categorySlug = mapped.slug;

  return {
    previewId,
    title: item.title,
    slug,
    category: categoryName,
    categorySlug,
    extractedCategory: item.category ?? null,
    dimensions,
    materials: item.materials ?? null,
    description: item.description ?? null,
    seoTitle: generateSeoTitle(item.title, categoryName),
    metaDescription: generateMetaDescription(item.title, categoryName, item.materials, dimensions),
    pageNumber: item.pageNumber,
    source: item.source,
    imageIds: (item.matchedImages ?? []).map((img) => imageRefId(img.pageNumber, img.index)),
    confidence,
    duplicateOf: existing
      ? { id: existing.id, slug: existing.slug, title: existing.title }
      : null,
    missing: item.missing ?? [],
    selected: !existing
  };
}

export function enrichImagesForQC(report, itemSlugByPreviewId) {
  const imageBuffers = report.imageBuffers ?? {};
  const images = [];

  for (const embedded of report.embeddedImages ?? []) {
    const id = imageRefId(embedded.pageNumber, embedded.index);
    const buffer = imageBuffers[id];
    const mime = buffer ? detectMime(buffer) : "image/png";
    const assignedPreviewId =
      Object.entries(itemSlugByPreviewId).find(([, imageIds]) => imageIds.includes(id))?.[0] ?? null;

    images.push({
      id,
      pageNumber: embedded.pageNumber,
      index: embedded.index,
      width: embedded.width ?? null,
      height: embedded.height ?? null,
      bytes: embedded.bytes ?? buffer?.length ?? 0,
      thumbnail: buffer ? bufferToDataUrl(buffer, mime) : null,
      assignedPreviewId
    });
  }

  return images;
}

/**
 * Build full QC preview from PDF analysis report.
 * @param {Record<string, unknown>} report
 * @param {{ id: string, slug: string, title: string }[]} existingItems
 */
export function buildImportPreview(report, existingItems = []) {
  const existingBySlug = new Map(existingItems.map((row) => [row.slug, row]));
  const rawItems = report.items ?? [];
  const deduped = ensureUniqueSlugs(
    rawItems.map((item) => ({
      ...item,
      slug: item.slug || slugify(item.title)
    }))
  );

  const items = deduped.map((item, index) =>
    enrichItemForQC(item, `preview-${index}`, existingBySlug)
  );

  const slugToPreview = Object.fromEntries(
    items.map((item) => [item.previewId, item.imageIds])
  );

  const images = enrichImagesForQC(report, slugToPreview);

  for (const image of images) {
    if (!image.assignedPreviewId && items.length) {
      const pageItem = items.find((item) => item.pageNumber === image.pageNumber);
      if (pageItem) {
        image.assignedPreviewId = pageItem.previewId;
        if (!pageItem.imageIds.includes(image.id)) {
          pageItem.imageIds.push(image.id);
        }
      }
    }
  }

  const duplicateCount = items.filter((item) => item.duplicateOf).length;
  const lowConfidenceCount = items.filter(
    (item) =>
      item.confidence.name < 60 ||
      item.confidence.category < 60 ||
      item.confidence.dimensions < 50 ||
      item.confidence.materials < 50
  ).length;

  return {
    fileName: report.fileName,
    pageCount: report.pageCount,
    furnitureItemCount: items.length,
    embeddedImageCount: images.length,
    imageMatchedItemCount: items.filter((item) => item.imageIds.length > 0).length,
    imageMappingStatus: report.imageMappingStatus,
    categories: [...new Set(items.map((item) => item.category))].sort(),
    categoryHierarchy: {
      root: FURNITURE_ROOT,
      children: FURNITURE_SUBCATEGORIES.map(({ slug, name }) => ({ slug, name }))
    },
    materials: [...new Set(items.map((item) => item.materials).filter(Boolean))].sort(),
    dimensions: [...new Set(items.map((item) => item.dimensions).filter(Boolean))].sort(),
    items,
    images,
    duplicateCount,
    duplicates: items.filter((item) => item.duplicateOf),
    lowConfidenceCount,
    rowsMissingDataCount: items.filter((item) => item.missing.length > 0).length,
    unclearMappings: report.unclearMappings ?? [],
    sourceType: "pdf"
  };
}

export function confidenceLabel(score) {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

/**
 * Ensure Furniture root + subcategories exist; returns map slug -> id.
 */
export async function ensureFurnitureCategoryHierarchy(supabase) {
  const { data: rows, error } = await supabase.from("furniture_categories").select("id, slug, name, parent_id");
  if (error) throw new Error(error.message);

  const bySlug = new Map((rows ?? []).map((row) => [row.slug, row]));
  let categoriesCreated = 0;

  async function upsertCategory(slug, name, description, sortOrder, parentId = null) {
    const existing = bySlug.get(slug);
    if (existing) {
      if (parentId && existing.parent_id !== parentId) {
        await supabase.from("furniture_categories").update({ parent_id: parentId }).eq("id", existing.id);
        existing.parent_id = parentId;
      }
      return existing.id;
    }

    const { data, error: insertError } = await supabase
      .from("furniture_categories")
      .insert({
        slug,
        name,
        description,
        sort_order: sortOrder,
        published: true,
        parent_id: parentId
      })
      .select("id, slug, parent_id")
      .single();

    if (insertError) throw new Error(insertError.message);
    bySlug.set(data.slug, data);
    categoriesCreated += 1;
    return data.id;
  }

  const rootId = await upsertCategory(
    FURNITURE_ROOT.slug,
    FURNITURE_ROOT.name,
    "Root category for all furniture collections.",
    0,
    null
  );

  for (let i = 0; i < FURNITURE_SUBCATEGORIES.length; i += 1) {
    const sub = FURNITURE_SUBCATEGORIES[i];
    await upsertCategory(sub.slug, sub.name, `${sub.name} collection.`, i + 1, rootId);
  }

  const slugToId = new Map([...bySlug.entries()].map(([slug, row]) => [slug, row.id]));
  return { slugToId, categoriesCreated, rootId };
}

export function parseDataUrl(dataUrl) {
  const match = String(dataUrl ?? "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}
