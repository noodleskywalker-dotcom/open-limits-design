import fs from "node:fs";
import path from "node:path";

const STORAGE_BUCKET = "site-media";
const CATALOG_PREFIX = "furniture-catalog";

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function detectMime(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
  if (buffer[8] === 0x57 && buffer[9] === 0x45) return "image/webp";
  return "image/png";
}

function extensionForMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "png";
}

function storagePathForImage(slug, pageNumber, index, ext) {
  return `${CATALOG_PREFIX}/${slug}/page-${pageNumber}-img-${index + 1}.${ext}`;
}

/**
 * Import furniture catalog from PDF buffer into Supabase.
 * Upserts categories and items by slug; re-import updates existing records.
 *
 * @param {Buffer} buffer
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function importFurnitureFromPdf(buffer, supabase) {
  const { analyzeFurniturePdf, dedupeFurnitureItems } = await import("./pdf-analyze.mjs");

  const analysis = await analyzeFurniturePdf(buffer, { includeImageBuffers: true });
  const items = dedupeFurnitureItems(analysis.items ?? []);
  const imageBuffers = analysis.imageBuffers ?? {};

  const result = {
    fileName: analysis.fileName,
    totalItems: items.length,
    created: 0,
    updated: 0,
    skipped: 0,
    categoriesCreated: 0,
    imagesUploaded: 0,
    imageLinksCreated: 0,
    errors: []
  };

  if (!items.length) {
    result.errors.push("No furniture items extracted from PDF.");
    return result;
  }

  const { data: categoryRows, error: categoryLoadError } = await supabase
    .from("furniture_categories")
    .select("id, slug, name");
  if (categoryLoadError) {
    throw new Error(categoryLoadError.message);
  }

  const categoryBySlug = new Map((categoryRows ?? []).map((row) => [row.slug, row.id]));

  async function ensureCategory(name) {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return null;

    const slug = slugify(trimmed);
    if (categoryBySlug.has(slug)) return categoryBySlug.get(slug);

    const { data, error } = await supabase
      .from("furniture_categories")
      .insert({
        slug,
        name: trimmed,
        published: true,
        sort_order: categoryBySlug.size + 1
      })
      .select("id, slug")
      .single();

    if (error) throw new Error(error.message);
    categoryBySlug.set(data.slug, data.id);
    result.categoriesCreated += 1;
    return data.id;
  }

  async function upsertMediaAsset(storagePath, imageBuffer, title, mimeType) {
    const { data: existing } = await supabase
      .from("media_assets")
      .select("id, public_url, storage_path")
      .eq("storage_path", storagePath)
      .maybeSingle();

    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, imageBuffer, {
      contentType: mimeType,
      upsert: true,
      cacheControl: "31536000"
    });
    if (uploadError) throw new Error(uploadError.message);

    const publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;

    if (existing) {
      await supabase
        .from("media_assets")
        .update({
          title,
          alt_text: title,
          category: "Furniture",
          public_url: publicUrl,
          mime_type: mimeType,
          size_bytes: imageBuffer.length
        })
        .eq("id", existing.id);
      return existing.id;
    }

    const { data, error } = await supabase
      .from("media_assets")
      .insert({
        title,
        alt_text: title,
        category: "Furniture",
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: mimeType,
        size_bytes: imageBuffer.length
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    result.imagesUploaded += 1;
    return data.id;
  }

  async function syncItemImages(furnitureItemId, slug, title, matchedImages) {
    const prefix = `${CATALOG_PREFIX}/${slug}/`;
    const linkedMediaIds = [];

    for (const imageRef of matchedImages) {
      const key = `${imageRef.pageNumber}:${imageRef.index}`;
      const imageBuffer = imageBuffers[key];
      if (!imageBuffer?.length) continue;

      const mimeType = detectMime(imageBuffer);
      const ext = extensionForMime(mimeType);
      const storagePath = storagePathForImage(slug, imageRef.pageNumber, imageRef.index, ext);

      try {
        const mediaId = await upsertMediaAsset(
          storagePath,
          imageBuffer,
          `${title} — page ${imageRef.pageNumber}`,
          mimeType
        );
        linkedMediaIds.push({ mediaId, sortOrder: imageRef.index });

        const { data: linkExisting } = await supabase
          .from("furniture_item_images")
          .select("media_id")
          .eq("furniture_item_id", furnitureItemId)
          .eq("media_id", mediaId)
          .maybeSingle();

        if (!linkExisting) {
          const { error: linkError } = await supabase.from("furniture_item_images").insert({
            furniture_item_id: furnitureItemId,
            media_id: mediaId,
            sort_order: imageRef.index
          });
          if (linkError) throw new Error(linkError.message);
          result.imageLinksCreated += 1;
        }
      } catch (error) {
        result.errors.push(
          `Image page ${imageRef.pageNumber} for "${title}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (linkedMediaIds.length) {
      linkedMediaIds.sort((a, b) => a.sortOrder - b.sortOrder);
      await supabase
        .from("furniture_items")
        .update({ featured_image_id: linkedMediaIds[0].mediaId })
        .eq("id", furnitureItemId);
    }

    const { data: existingLinks } = await supabase
      .from("furniture_item_images")
      .select("media_id, media:media_assets(storage_path)")
      .eq("furniture_item_id", furnitureItemId);

    for (const link of existingLinks ?? []) {
      const storagePath = link.media?.storage_path;
      if (!storagePath?.startsWith(prefix)) continue;
      if (!linkedMediaIds.some((entry) => entry.mediaId === link.media_id)) {
        await supabase
          .from("furniture_item_images")
          .delete()
          .eq("furniture_item_id", furnitureItemId)
          .eq("media_id", link.media_id);
      }
    }
  }

  for (let sortOrder = 0; sortOrder < items.length; sortOrder += 1) {
    const item = items[sortOrder];

    if (!item.title?.trim()) {
      result.skipped += 1;
      continue;
    }

    if (!item.category?.trim()) {
      result.skipped += 1;
      result.errors.push(`Skipped "${item.title}": no category extracted from PDF.`);
      continue;
    }

    const slug = item.slug || slugify(item.title);
    let categoryId;
    try {
      categoryId = await ensureCategory(item.category);
    } catch (error) {
      result.skipped += 1;
      result.errors.push(
        `Category "${item.category}" for "${item.title}": ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }

    if (!categoryId) {
      result.skipped += 1;
      continue;
    }

    const payload = {
      slug,
      title: item.title.trim(),
      description: (item.description ?? item.title).trim(),
      dimensions: item.dimensionDisplay ?? item.dimensions ?? null,
      width: item.width ?? null,
      depth: item.depth ?? null,
      height: item.height ?? null,
      materials: item.materials ?? null,
      category_id: categoryId,
      sort_order: sortOrder + 1,
      published: true
    };

    const { data: existing } = await supabase.from("furniture_items").select("id").eq("slug", slug).maybeSingle();

    let furnitureItemId;
    if (existing) {
      const { error } = await supabase.from("furniture_items").update(payload).eq("id", existing.id);
      if (error) {
        result.skipped += 1;
        result.errors.push(`Update "${item.title}": ${error.message}`);
        continue;
      }
      furnitureItemId = existing.id;
      result.updated += 1;
    } else {
      const { data, error } = await supabase.from("furniture_items").insert(payload).select("id").single();
      if (error) {
        result.skipped += 1;
        result.errors.push(`Insert "${item.title}": ${error.message}`);
        continue;
      }
      furnitureItemId = data.id;
      result.created += 1;
    }

    if (item.matchedImages?.length) {
      await syncItemImages(furnitureItemId, slug, item.title, item.matchedImages);
    }
  }

  return result;
}

/**
 * CLI entry — import PDF from path.
 */
export async function importFurniturePdfFromFile(filePath, supabase) {
  const buffer = fs.readFileSync(path.resolve(filePath));
  return importFurnitureFromPdf(buffer, supabase);
}
