import fs from "node:fs";
import path from "node:path";

import {
  ensureFurnitureCategoryHierarchy,
  ensureUniqueSlugs,
  parseDataUrl,
  slugify
} from "./import-qc.mjs";

const STORAGE_BUCKET = "site-media";
const CATALOG_PREFIX = "furniture-catalog";

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

function storagePathForImage(slug, imageId, ext) {
  const safeId = String(imageId).replace(/[^a-zA-Z0-9:_-]/g, "-");
  return `${CATALOG_PREFIX}/${slug}/${safeId}.${ext}`;
}

function emptyRollbackSnapshot() {
  return {
    createdItemIds: [],
    updatedItems: [],
    createdCategoryIds: [],
    createdMediaIds: [],
    createdImageLinks: [],
    updatedFeaturedImages: []
  };
}

/**
 * Import admin-confirmed furniture catalog payload (never auto-imports from PDF).
 *
 * @param {{
 *   fileName: string;
 *   sourceType?: string;
 *   confirmed: boolean;
 *   items: Array<Record<string, unknown>>;
 *   images: Array<Record<string, unknown>>;
 * }} payload
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ userId?: string | null }} [options]
 */
export async function importConfirmedFurnitureCatalog(payload, supabase, options = {}) {
  if (!payload?.confirmed) {
    throw new Error("Import requires admin confirmation. Set confirmed: true after reviewing the preview.");
  }

  const items = ensureUniqueSlugs(
    (payload.items ?? []).map((item) => ({
      ...item,
      slug: item.slug || slugify(item.title)
    }))
  );

  const imagesById = new Map((payload.images ?? []).map((image) => [image.id, image]));

  const result = {
    batchId: null,
    fileName: payload.fileName ?? "catalog-import",
    totalItems: items.length,
    created: 0,
    updated: 0,
    skipped: 0,
    categoriesCreated: 0,
    imagesUploaded: 0,
    imageLinksCreated: 0,
    errors: [],
    log: []
  };

  if (!items.length) {
    result.errors.push("No items in confirmed import payload.");
    return result;
  }

  const snapshot = emptyRollbackSnapshot();
  const { slugToId, categoriesCreated } = await ensureFurnitureCategoryHierarchy(supabase);
  result.categoriesCreated = categoriesCreated;
  snapshot.createdCategoryIds = categoriesCreated > 0 ? [] : [];

  async function upsertMediaAsset(storagePath, imageBuffer, title, mimeType, trackCreate = true) {
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
      return { mediaId: existing.id, created: false };
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
    if (trackCreate) snapshot.createdMediaIds.push(data.id);
    return { mediaId: data.id, created: true };
  }

  async function syncItemImages(furnitureItemId, slug, title, imageIds) {
    const prefix = `${CATALOG_PREFIX}/${slug}/`;
    const linkedMediaIds = [];

    for (let sortOrder = 0; sortOrder < imageIds.length; sortOrder += 1) {
      const imageId = imageIds[sortOrder];
      const imageRecord = imagesById.get(imageId);
      if (!imageRecord) continue;

      const parsed = parseDataUrl(imageRecord.thumbnail ?? imageRecord.dataUrl);
      if (!parsed?.buffer?.length) continue;

      const mimeType = detectMime(parsed.buffer);
      const ext = extensionForMime(mimeType);
      const storagePath = storagePathForImage(slug, imageId, ext);

      try {
        const { mediaId, created } = await upsertMediaAsset(
          storagePath,
          parsed.buffer,
          `${title} — ${imageId}`,
          mimeType
        );
        if (created) result.imagesUploaded += 1;
        linkedMediaIds.push({ mediaId, sortOrder });

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
            sort_order: sortOrder
          });
          if (linkError) throw new Error(linkError.message);
          snapshot.createdImageLinks.push({ furniture_item_id: furnitureItemId, media_id: mediaId });
          result.imageLinksCreated += 1;
        }
      } catch (error) {
        result.errors.push(
          `Image ${imageId} for "${title}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (linkedMediaIds.length) {
      linkedMediaIds.sort((a, b) => a.sortOrder - b.sortOrder);
      const { data: beforeItem } = await supabase
        .from("furniture_items")
        .select("featured_image_id")
        .eq("id", furnitureItemId)
        .maybeSingle();

      snapshot.updatedFeaturedImages.push({
        itemId: furnitureItemId,
        beforeFeaturedImageId: beforeItem?.featured_image_id ?? null
      });

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

    if (item.selected === false) {
      result.skipped += 1;
      result.log.push(`Skipped (deselected): ${item.title}`);
      continue;
    }

    if (!item.title?.trim()) {
      result.skipped += 1;
      continue;
    }

    const categorySlug = item.categorySlug || slugify(item.category);
    const categoryId = slugToId.get(categorySlug);
    if (!categoryId) {
      result.skipped += 1;
      result.errors.push(`Skipped "${item.title}": unknown category "${item.category}".`);
      continue;
    }

    const slug = item.slug || slugify(item.title);
    const itemPayload = {
      slug,
      title: item.title.trim(),
      description: (item.description ?? item.title).trim(),
      dimensions: item.dimensions ?? null,
      width: item.width ?? null,
      depth: item.depth ?? null,
      height: item.height ?? null,
      materials: item.materials ?? null,
      seo_title: item.seoTitle ?? null,
      meta_description: item.metaDescription ?? null,
      category_id: categoryId,
      sort_order: sortOrder + 1,
      published: item.published !== false
    };

    const { data: existing } = await supabase
      .from("furniture_items")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    let furnitureItemId;
    if (existing) {
      snapshot.updatedItems.push({
        id: existing.id,
        before: existing
      });

      const { error } = await supabase.from("furniture_items").update(itemPayload).eq("id", existing.id);
      if (error) {
        result.skipped += 1;
        result.errors.push(`Update "${item.title}": ${error.message}`);
        continue;
      }
      furnitureItemId = existing.id;
      result.updated += 1;
      result.log.push(`Updated: ${item.title}`);
    } else {
      const { data, error } = await supabase.from("furniture_items").insert(itemPayload).select("id").single();
      if (error) {
        result.skipped += 1;
        result.errors.push(`Insert "${item.title}": ${error.message}`);
        continue;
      }
      furnitureItemId = data.id;
      snapshot.createdItemIds.push(data.id);
      result.created += 1;
      result.log.push(`Created: ${item.title}`);
    }

    const imageIds = item.imageIds ?? [];
    if (imageIds.length) {
      await syncItemImages(furnitureItemId, slug, item.title, imageIds);
    }
  }

  const imageCount = (payload.images ?? []).length;
  const batchStatus = result.errors.length && result.created + result.updated === 0 ? "failed" : result.errors.length ? "partial" : "completed";

  const { data: batch, error: batchError } = await supabase
    .from("furniture_import_batches")
    .insert({
      source_type: payload.sourceType ?? "pdf",
      file_name: result.fileName,
      item_count: result.created + result.updated,
      image_count: imageCount,
      status: batchStatus,
      log: [...result.log, ...result.errors.map((line) => `ERROR: ${line}`)],
      rollback_snapshot: snapshot,
      imported_by: options.userId ?? null
    })
    .select("id")
    .single();

  if (batchError) {
    result.errors.push(`Could not save import history: ${batchError.message}`);
  } else {
    result.batchId = batch.id;
  }

  return result;
}

/**
 * Roll back a completed import batch using its stored snapshot.
 */
export async function rollbackFurnitureImportBatch(batchId, supabase) {
  const { data: batch, error } = await supabase
    .from("furniture_import_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!batch) throw new Error("Import batch not found.");
  if (batch.status === "rolled_back") throw new Error("This import was already rolled back.");

  const snapshot = batch.rollback_snapshot ?? {};
  const result = {
    batchId,
    deletedItems: 0,
    restoredItems: 0,
    deletedMedia: 0,
    errors: []
  };

  for (const link of snapshot.createdImageLinks ?? []) {
    await supabase
      .from("furniture_item_images")
      .delete()
      .eq("furniture_item_id", link.furniture_item_id)
      .eq("media_id", link.media_id);
  }

  for (const entry of snapshot.updatedFeaturedImages ?? []) {
    await supabase
      .from("furniture_items")
      .update({ featured_image_id: entry.beforeFeaturedImageId })
      .eq("id", entry.itemId);
  }

  for (const itemId of snapshot.createdItemIds ?? []) {
    const { error: deleteError } = await supabase.from("furniture_items").delete().eq("id", itemId);
    if (deleteError) result.errors.push(`Delete item ${itemId}: ${deleteError.message}`);
    else result.deletedItems += 1;
  }

  for (const entry of snapshot.updatedItems ?? []) {
    const { id, before } = entry;
    if (!before) continue;
    const { error: restoreError } = await supabase.from("furniture_items").update(before).eq("id", id);
    if (restoreError) result.errors.push(`Restore item ${id}: ${restoreError.message}`);
    else result.restoredItems += 1;
  }

  for (const mediaId of snapshot.createdMediaIds ?? []) {
    const { data: asset } = await supabase
      .from("media_assets")
      .select("storage_path")
      .eq("id", mediaId)
      .maybeSingle();

    if (asset?.storage_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([asset.storage_path]);
    }

    const { error: mediaDeleteError } = await supabase.from("media_assets").delete().eq("id", mediaId);
    if (mediaDeleteError) result.errors.push(`Delete media ${mediaId}: ${mediaDeleteError.message}`);
    else result.deletedMedia += 1;
  }

  await supabase
    .from("furniture_import_batches")
    .update({
      status: "rolled_back",
      rolled_back_at: new Date().toISOString(),
      log: [...(batch.log ?? []), `Rolled back: deleted ${result.deletedItems} item(s), restored ${result.restoredItems} update(s).`]
    })
    .eq("id", batchId);

  return result;
}

/**
 * Legacy: direct PDF import (deprecated — use confirmed payload import).
 * @deprecated Use importConfirmedFurnitureCatalog after admin preview.
 */
export async function importFurnitureFromPdf(buffer, supabase) {
  const { analyzeFurniturePdf, dedupeFurnitureItems } = await import("./pdf-analyze.mjs");
  const { buildImportPreview } = await import("./import-qc.mjs");

  const analysis = await analyzeFurniturePdf(buffer, { includeImageBuffers: true });
  const preview = buildImportPreview(analysis, []);

  const images = preview.images.map((image) => ({
    id: image.id,
    thumbnail: image.thumbnail,
    pageNumber: image.pageNumber,
    index: image.index
  }));

  return importConfirmedFurnitureCatalog(
    {
      fileName: analysis.fileName,
      sourceType: "pdf",
      confirmed: true,
      items: preview.items.map((item) => ({
        ...item,
        selected: true
      })),
      images
    },
    supabase
  );
}

export async function importFurniturePdfFromFile(filePath, supabase) {
  const buffer = fs.readFileSync(path.resolve(filePath));
  return importFurnitureFromPdf(buffer, supabase);
}
