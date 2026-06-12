"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { FurnitureCategory, FurnitureItem, MediaAsset } from "@/lib/cms/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type FurnitureCategoryForm = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  published: boolean;
};

type FurnitureItemForm = {
  id: string;
  title: string;
  slug: string;
  description: string;
  dimensions: string;
  materials: string;
  categoryId: string;
  featuredImageId: string;
  imageIds: string[];
  sortOrder: string;
  published: boolean;
};

type FurnitureImageRow = {
  media_id: string;
  sort_order: number;
  media: MediaAsset | null;
};

type FurnitureItemRow = FurnitureItem & {
  furniture_item_images?: FurnitureImageRow[];
};

const blankCategory: FurnitureCategoryForm = {
  id: "",
  name: "",
  slug: "",
  description: "",
  sortOrder: "0",
  published: true
};

const blankItem: FurnitureItemForm = {
  id: "",
  title: "",
  slug: "",
  description: "",
  dimensions: "",
  materials: "",
  categoryId: "",
  featuredImageId: "",
  imageIds: [],
  sortOrder: "0",
  published: true
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFurnitureItem(item: FurnitureItemRow): FurnitureItem {
  return {
    ...item,
    gallery: (item.furniture_item_images ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => image.media)
      .filter((asset): asset is MediaAsset => Boolean(asset))
  };
}

function FurnitureImageSelect({
  label,
  value,
  media,
  onChange
}: {
  label: string;
  value: string;
  media: MediaAsset[];
  onChange: (value: string) => void;
}) {
  const furnitureMedia = media.filter((asset) => asset.category === "Furniture");

  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No image selected</option>
        {furnitureMedia.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.title}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FurnitureAdminPanel({ media }: { media: MediaAsset[] }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [categories, setCategories] = useState<FurnitureCategory[]>([]);
  const [items, setItems] = useState<FurnitureItem[]>([]);
  const [categoryForm, setCategoryForm] = useState<FurnitureCategoryForm>(blankCategory);
  const [itemForm, setItemForm] = useState<FurnitureItemForm>(blankItem);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const furnitureMedia = media.filter((asset) => asset.category === "Furniture");

  const loadFurnitureData = useCallback(async () => {
    if (!supabase) return;

    const [categoryResult, itemResult] = await Promise.all([
      supabase.from("furniture_categories").select("*").order("sort_order"),
      supabase
        .from("furniture_items")
        .select("*, category:furniture_categories(*), featured_image:media_assets(*), furniture_item_images(media_id, sort_order, media:media_assets(*))")
        .order("sort_order")
    ]);

    if (categoryResult.error) throw categoryResult.error;
    if (itemResult.error) throw itemResult.error;

    setCategories((categoryResult.data ?? []) as FurnitureCategory[]);
    setItems(((itemResult.data ?? []) as FurnitureItemRow[]).map(normalizeFurnitureItem));
  }, [supabase]);

  useEffect(() => {
    // Initial furniture CMS synchronization after admin authentication.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFurnitureData().catch((loadError: Error) => {
      setError(loadError.message);
    });
  }, [loadFurnitureData]);

  function editCategory(category: FurnitureCategory) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      sortOrder: String(category.sort_order ?? 0),
      published: category.published
    });
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError("");
    setMessage("");

    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug || slugify(categoryForm.name),
      description: categoryForm.description || null,
      sort_order: Number(categoryForm.sortOrder) || 0,
      published: categoryForm.published
    };

    const { error: saveError } = categoryForm.id
      ? await supabase.from("furniture_categories").update(payload).eq("id", categoryForm.id)
      : await supabase.from("furniture_categories").insert(payload);

    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }

    setCategoryForm(blankCategory);
    setMessage("Furniture category saved.");
    await loadFurnitureData();
  }

  async function deleteCategory(categoryId: string) {
    if (!supabase) return;

    const { error: deleteError } = await supabase
      .from("furniture_categories")
      .delete()
      .eq("id", categoryId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Furniture category deleted.");
    await loadFurnitureData();
  }

  function editItem(item: FurnitureItem) {
    setItemForm({
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: item.description,
      dimensions: item.dimensions ?? "",
      materials: item.materials ?? "",
      categoryId: item.category_id,
      featuredImageId: item.featured_image_id ?? "",
      imageIds: item.gallery?.map((asset) => asset.id) ?? [],
      sortOrder: String(item.sort_order ?? 0),
      published: item.published
    });
  }

  async function replaceItemGallery(itemId: string, imageIds: string[]) {
    if (!supabase) return;

    const { error: deleteError } = await supabase
      .from("furniture_item_images")
      .delete()
      .eq("furniture_item_id", itemId);
    if (deleteError) throw deleteError;

    if (!imageIds.length) return;

    const { error: insertError } = await supabase.from("furniture_item_images").insert(
      imageIds.map((mediaId, index) => ({
        furniture_item_id: itemId,
        media_id: mediaId,
        sort_order: index
      }))
    );
    if (insertError) throw insertError;
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        title: itemForm.title,
        slug: itemForm.slug || slugify(itemForm.title),
        description: itemForm.description,
        dimensions: itemForm.dimensions || null,
        materials: itemForm.materials || null,
        category_id: itemForm.categoryId,
        featured_image_id: itemForm.featuredImageId || null,
        sort_order: Number(itemForm.sortOrder) || 0,
        published: itemForm.published
      };

      const result = itemForm.id
        ? await supabase.from("furniture_items").update(payload).eq("id", itemForm.id).select("id").single()
        : await supabase.from("furniture_items").insert(payload).select("id").single();

      if (result.error) throw result.error;

      await replaceItemGallery(result.data.id as string, itemForm.imageIds);
      setItemForm(blankItem);
      setMessage("Furniture item saved.");
      await loadFurnitureData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save furniture item");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(itemId: string) {
    if (!supabase) return;

    const { error: deleteError } = await supabase.from("furniture_items").delete().eq("id", itemId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Furniture item deleted.");
    await loadFurnitureData();
  }

  return (
    <div>
      {message ? <p className="status success">{message}</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      <form className="form-grid" onSubmit={saveCategory}>
        <div className="field full">
          <h2>Furniture categories</h2>
          <p>Manage Sofas, Majlis, Chairs, Tables, Bedrooms, Exterior, and any other furniture category.</p>
        </div>
        <label className="field">
          <span>Name</span>
          <input
            value={categoryForm.name}
            onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Slug</span>
          <input
            value={categoryForm.slug}
            placeholder="auto-generated if blank"
            onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })}
          />
        </label>
        <label className="field full">
          <span>Description</span>
          <textarea
            value={categoryForm.description}
            onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Sort order</span>
          <input
            value={categoryForm.sortOrder}
            onChange={(event) => setCategoryForm({ ...categoryForm, sortOrder: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Published</span>
          <select
            value={String(categoryForm.published)}
            onChange={(event) => setCategoryForm({ ...categoryForm, published: event.target.value === "true" })}
          >
            <option value="true">Published</option>
            <option value="false">Hidden</option>
          </select>
        </label>
        <div className="button-row">
          <button className="button" disabled={busy} type="submit">
            Save category
          </button>
          <button className="button light" onClick={() => setCategoryForm(blankCategory)} type="button">
            New category
          </button>
        </div>
      </form>

      <div className="row-list">
        {categories.map((category) => (
          <div className="row-item" key={category.id}>
            <div className="row-thumb" />
            <div>
              <strong>{category.name}</strong>
              <p>{category.slug} · {category.published ? "Published" : "Hidden"}</p>
            </div>
            <div className="button-row">
              <button className="button light" onClick={() => editCategory(category)} type="button">
                Edit
              </button>
              <button className="button light" onClick={() => deleteCategory(category.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="form-grid form-card" onSubmit={saveItem}>
        <div className="field full">
          <h2>{itemForm.id ? "Edit furniture item" : "Create furniture item"}</h2>
          <p>Upload furniture photos in the Media tab with the Furniture category, then assign them here.</p>
        </div>
        <label className="field">
          <span>Title</span>
          <input
            value={itemForm.title}
            onChange={(event) => setItemForm({ ...itemForm, title: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Slug</span>
          <input
            value={itemForm.slug}
            placeholder="auto-generated if blank"
            onChange={(event) => setItemForm({ ...itemForm, slug: event.target.value })}
          />
        </label>
        <label className="field full">
          <span>Description</span>
          <textarea
            value={itemForm.description}
            onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Dimensions</span>
          <input
            value={itemForm.dimensions}
            placeholder="Example: 2400W x 950D x 760H mm"
            onChange={(event) => setItemForm({ ...itemForm, dimensions: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Materials</span>
          <input
            value={itemForm.materials}
            placeholder="Example: oak, linen, brass"
            onChange={(event) => setItemForm({ ...itemForm, materials: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select
            value={itemForm.categoryId}
            onChange={(event) => setItemForm({ ...itemForm, categoryId: event.target.value })}
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <FurnitureImageSelect
          label="Featured image"
          value={itemForm.featuredImageId}
          media={media}
          onChange={(value) => setItemForm({ ...itemForm, featuredImageId: value })}
        />
        <label className="field">
          <span>Sort order</span>
          <input
            value={itemForm.sortOrder}
            onChange={(event) => setItemForm({ ...itemForm, sortOrder: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Published</span>
          <select
            value={String(itemForm.published)}
            onChange={(event) => setItemForm({ ...itemForm, published: event.target.value === "true" })}
          >
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </label>
        <label className="field full">
          <span>Furniture images</span>
          <select
            multiple
            value={itemForm.imageIds}
            onChange={(event) =>
              setItemForm({
                ...itemForm,
                imageIds: Array.from(event.target.selectedOptions).map((option) => option.value)
              })
            }
          >
            {furnitureMedia.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
        </label>
        <div className="button-row">
          <button className="button" disabled={busy} type="submit">
            Save furniture item
          </button>
          <button className="button light" onClick={() => setItemForm(blankItem)} type="button">
            New furniture item
          </button>
        </div>
      </form>

      <div className="row-list">
        {items.map((item) => (
          <div className="row-item" key={item.id}>
            {item.featured_image ? (
              <img src={item.featured_image.public_url} alt={item.featured_image.alt_text ?? item.title} />
            ) : (
              <div className="row-thumb" />
            )}
            <div>
              <strong>{item.title}</strong>
              <p>
                {item.category?.name ?? "Uncategorized"} · {item.published ? "Published" : "Draft"} ·{" "}
                {item.gallery?.length ?? 0} images
              </p>
            </div>
            <div className="button-row">
              <button className="button light" onClick={() => editItem(item)} type="button">
                Edit
              </button>
              <button className="button light" onClick={() => deleteItem(item.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
