import {
  fallbackCompanyProfile,
  fallbackFurnitureCategories,
  fallbackFurnitureItems,
  fallbackMaterials,
  fallbackProjects,
  fallbackServices,
  fallbackTeam
} from "./fallback";
import type {
  CompanyProfile,
  FurnitureCategory,
  FurnitureItem,
  HomepageHeroImage,
  Material,
  MediaAsset,
  Project,
  ProjectComparison,
  Service,
  TeamMember
} from "./types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SortedImageRow = {
  media: MediaAsset | null;
  sort_order: number;
};

type ProjectRow = Project & {
  project_images?: SortedImageRow[];
  project_comparisons?: ProjectComparison[];
};

type FurnitureItemRow = FurnitureItem & {
  furniture_item_images?: SortedImageRow[];
  furniture_item_materials?: { material: Material | null }[];
};

const projectSelect = `
  *,
  featured_image:media_assets(*),
  project_images(
    sort_order,
    media:media_assets(*)
  ),
  project_comparisons(
    *,
    before_image:media_assets!project_comparisons_before_image_id_fkey(*),
    after_image:media_assets!project_comparisons_after_image_id_fkey(*)
  )
`;

const furnitureSelect = `
  *,
  category:furniture_categories(*),
  featured_image:media_assets(*),
  furniture_item_images(
    sort_order,
    media:media_assets(*)
  ),
  furniture_item_materials(
    material:materials(*)
  )
`;

function sortedGallery(rows: SortedImageRow[] | undefined): MediaAsset[] {
  return (rows ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => row.media)
    .filter((asset): asset is MediaAsset => Boolean(asset));
}

function normalizeProject(project: ProjectRow): Project {
  return {
    ...project,
    gallery: sortedGallery(project.project_images),
    comparisons: (project.project_comparisons ?? []).sort((a, b) => a.sort_order - b.sort_order)
  };
}

function normalizeFurnitureItem(item: FurnitureItemRow): FurnitureItem {
  return {
    ...item,
    gallery: sortedGallery(item.furniture_item_images),
    material_records: (item.furniture_item_materials ?? [])
      .map((row) => row.material)
      .filter((material): material is Material => Boolean(material))
  };
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackCompanyProfile;

  const { data, error } = await supabase
    .from("company_profile")
    .select("*, ceo_image:media_assets(*)")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return fallbackCompanyProfile;

  return { ...fallbackCompanyProfile, ...data } as CompanyProfile;
}

export async function getHomepageHeroImages(): Promise<HomepageHeroImage[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("homepage_hero_images")
    .select("*, media:media_assets(*)")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data as HomepageHeroImage[];
}

export async function getServices(includeInactive = false): Promise<Service[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackServices;

  // Retry without the media join when the image_id column has not been migrated yet.
  for (const select of ["*, image:media_assets(*)", "*"]) {
    let query = supabase.from("services").select(select).order("sort_order", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (!error && data) return data as unknown as Service[];
  }

  return fallbackServices;
}

export async function getProjects(includeUnpublished = false): Promise<Project[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackProjects;

  let query = supabase.from("projects").select(projectSelect).order("sort_order", { ascending: true });
  if (!includeUnpublished) query = query.eq("is_published", true);

  const { data, error } = await query;
  if (error || !data) return fallbackProjects;

  return (data as unknown as ProjectRow[]).map(normalizeProject);
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select(projectSelect)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  return normalizeProject(data as unknown as ProjectRow);
}

export async function getTeamMembers(includeInactive = false): Promise<TeamMember[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackTeam;

  // Retry without the media join when the photo_id column has not been migrated yet.
  for (const select of ["*, photo:media_assets(*)", "*"]) {
    let query = supabase.from("team_members").select(select).order("sort_order", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (!error && data) return data as unknown as TeamMember[];
  }

  return fallbackTeam;
}

export async function getFurnitureCategories(includeUnpublished = false): Promise<FurnitureCategory[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackFurnitureCategories;

  let query = supabase
    .from("furniture_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!includeUnpublished) query = query.eq("published", true);

  const { data, error } = await query;
  if (error || !data) return fallbackFurnitureCategories;

  return data as FurnitureCategory[];
}

export async function getFurnitureItems(includeUnpublished = false): Promise<FurnitureItem[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackFurnitureItems;

  let query = supabase
    .from("furniture_items")
    .select(furnitureSelect)
    .order("sort_order", { ascending: true });
  if (!includeUnpublished) query = query.eq("published", true);

  const { data, error } = await query;
  if (error || !data) return fallbackFurnitureItems;

  return (data as unknown as FurnitureItemRow[]).map(normalizeFurnitureItem);
}

export async function getFurnitureItemBySlug(slug: string): Promise<FurnitureItem | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("furniture_items")
    .select(furnitureSelect)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) return null;

  return normalizeFurnitureItem(data as unknown as FurnitureItemRow);
}

export async function getRelatedFurnitureItems(item: FurnitureItem, limit = 3): Promise<FurnitureItem[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("furniture_items")
    .select(furnitureSelect)
    .eq("category_id", item.category_id)
    .eq("published", true)
    .neq("id", item.id)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return (data as unknown as FurnitureItemRow[]).map(normalizeFurnitureItem);
}

export async function getMaterials(includeUnpublished = false): Promise<Material[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackMaterials;

  let query = supabase
    .from("materials")
    .select("*, image:media_assets(*)")
    .order("sort_order", { ascending: true });
  if (!includeUnpublished) query = query.eq("published", true);

  const { data, error } = await query;
  if (error || !data) return fallbackMaterials;

  return data as Material[];
}
