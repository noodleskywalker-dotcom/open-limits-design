/**
 * Pure furniture category logic — no Supabase or Next.js imports.
 */

export const FURNITURE_CATEGORIES = [
  "All",
  "Sofas",
  "Majlis",
  "Chairs",
  "Tables",
  "Beds",
  "Cabinets",
  "Lighting",
  "Decor",
  "Bedrooms",
  "Exterior",
  "Dining",
  "Custom Furniture"
] as const;

export type FurnitureCategoryName = (typeof FURNITURE_CATEGORIES)[number];

export type FurnitureProductLike = {
  id: string;
  title: string;
  slug: string;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

/** Classify a product by name using Open Limits filtering rules. */
export function getFurnitureCategory(productName: string): Exclude<FurnitureCategoryName, "All"> {
  const name = normalizeName(productName);

  if (/sofa|l-shaped sofa|couch/.test(name)) return "Sofas";
  if (/majlis/.test(name)) return "Majlis";
  if (/chair|armchair|desk chair|pouf|stool/.test(name)) return "Chairs";
  if (/table|coffee table|dining table|night table|tv table|study table|side table/.test(name)) {
    return "Tables";
  }
  if (/\bbed\b/.test(name)) return "Beds";
  if (/cabinet|wardrobe|dresser|console/.test(name)) return "Cabinets";
  if (/lamp|light|chandelier/.test(name)) return "Lighting";
  if (/bedroom/.test(name)) return "Bedrooms";
  if (/exterior|outdoor/.test(name)) return "Exterior";
  if (/dining/.test(name)) return "Dining";
  if (/custom/.test(name)) return "Custom Furniture";

  return "Decor";
}

/** Filter products by selected category name. */
export function filterFurnitureProducts<T extends FurnitureProductLike>(
  products: T[],
  category: FurnitureCategoryName
): T[] {
  if (category === "All") return products;
  return products.filter((product) => getFurnitureCategory(product.title) === category);
}

/** Slugify for unique slug generation. */
export function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ensure every item has a unique slug. */
export function ensureUniqueSlugs<T extends FurnitureProductLike>(items: T[]): (T & { slug: string })[] {
  const used = new Set<string>();
  return items.map((item) => {
    let base = item.slug || slugifyTitle(item.title);
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
