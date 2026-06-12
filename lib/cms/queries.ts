import {
  fallbackCompanyProfile,
  fallbackFurnitureCategories,
  fallbackFurnitureItems,
  fallbackIntroSlides,
  fallbackMaterials,
  fallbackProjects,
  fallbackServices,
  fallbackShowroomSections,
  fallbackTeam
} from "./fallback";
import { filterFurnitureProducts, getFurnitureCategory } from "@/lib/furniture-categories";
import type {
  CompanyProfile,
  FurnitureCategory,
  FurnitureItem,
  HomepageHeroImage,
  IntroSlide,
  IntroSettings,
  Material,
  MediaAsset,
  Project,
  ProjectComparison,
  Service,
  ShowroomImage,
  ShowroomSection,
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
  featured_image:media_assets!projects_featured_image_id_fkey(*),
  project_images(
    sort_order,
    media:media_assets!project_images_media_id_fkey(*)
  ),
  project_comparisons(
    *,
    before_image:media_assets!project_comparisons_before_image_id_fkey(*),
    after_image:media_assets!project_comparisons_after_image_id_fkey(*)
  )
`;

const projectSelectLegacy = `*, project_images(sort_order, media_id)`;

const furnitureSelect = `
  *,
  category:furniture_categories(*),
  featured_image:media_assets!furniture_items_featured_image_id_fkey(*),
  furniture_item_images(
    sort_order,
    media:media_assets!furniture_item_images_media_id_fkey(*)
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

  for (const select of [
    "*, ceo_image:media_assets!company_profile_ceo_image_id_fkey(*), logo_image:media_assets!company_profile_logo_image_id_fkey(*)",
    "*, ceo_image:media_assets(*)",
    "*"
  ]) {
    const { data, error } = await supabase.from("company_profile").select(select).eq("id", 1).maybeSingle();
    if (!error && data && typeof data === "object") {
      return { ...fallbackCompanyProfile, ...(data as CompanyProfile) };
    }
  }

  return fallbackCompanyProfile;
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
  for (const select of ["*, image:media_assets!services_image_id_fkey(*)", "*, image:media_assets(*)", "*"]) {
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

  for (const select of [projectSelect, projectSelectLegacy, "*"]) {
    let query = supabase.from("projects").select(select).order("sort_order", { ascending: true });
    if (!includeUnpublished) query = query.eq("is_published", true);
    const { data, error } = await query;
    if (!error && data) {
      return (data as unknown as ProjectRow[]).map(normalizeProject);
    }
  }

  return fallbackProjects;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  for (const select of [projectSelect, projectSelectLegacy, "*"]) {
    const { data, error } = await supabase
      .from("projects")
      .select(select)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!error && data) return normalizeProject(data as unknown as ProjectRow);
  }

  return null;
}

export async function getTeamMembers(includeInactive = false): Promise<TeamMember[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackTeam;

  // Retry without the media join when the photo_id column has not been migrated yet.
  for (const select of ["*, photo:media_assets!team_members_photo_id_fkey(*)", "*, photo:media_assets(*)", "*"]) {
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
  const all = await getFurnitureItems();
  const sameCategory = filterFurnitureProducts(all, getFurnitureCategory(item.title)).filter(
    (candidate) => candidate.id !== item.id
  );
  return sameCategory.slice(0, limit);
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

export async function getIntroSlides(): Promise<IntroSlide[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackIntroSlides;

  for (const select of [
    "*, media:media_assets!intro_slides_media_id_fkey(*)",
    "*, media:media_assets(*)",
    "*"
  ]) {
    const { data, error } = await supabase
      .from("intro_slides")
      .select(select)
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (!error && data) return data as unknown as IntroSlide[];
  }
  return fallbackIntroSlides;
}

export async function getShowroomSections(): Promise<ShowroomSection[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackShowroomSections;

  for (const select of [
    "*, image:media_assets!showroom_sections_image_id_fkey(*)",
    "*, image:media_assets(*)",
    "*"
  ]) {
    const { data, error } = await supabase
      .from("showroom_sections")
      .select(select)
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (!error && data) return data as unknown as ShowroomSection[];
  }
  return fallbackShowroomSections;
}

export async function getShowroomSectionBySlug(slug: string): Promise<ShowroomSection | null> {
  const sections = await getShowroomSections();
  return sections.find((s) => s.slug === slug) ?? null;
}

export async function getShowroomImages(sectionId: string): Promise<ShowroomImage[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  for (const select of [
    "*, media:media_assets!showroom_images_media_id_fkey(*), hotspots:showroom_hotspots(*)",
    "*, media:media_assets(*), hotspots:showroom_hotspots(*)",
    "*"
  ]) {
    const { data, error } = await supabase
      .from("showroom_images")
      .select(select)
      .eq("section_id", sectionId)
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (!error && data) {
      return (data as unknown as ShowroomImage[]).map((row) => ({
        ...row,
        hotspots: (row.hotspots ?? []).sort((a, b) => a.sort_order - b.sort_order)
      }));
    }
  }
  return [];
}

const INTRO_SETTING_DEFAULTS: IntroSettings = {
  enabled: true,
  autoplayMs: 3200,
  introTitle: null,
  introSubtitle: null
};

export async function getIntroSettings(): Promise<IntroSettings> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return INTRO_SETTING_DEFAULTS;

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["intro_enabled", "intro_autoplay_ms", "intro_title", "intro_subtitle"]);

  if (error || !data) return INTRO_SETTING_DEFAULTS;

  const map = Object.fromEntries(data.map((row) => [row.key, row.value]));
  return {
    enabled: map.intro_enabled !== "false",
    autoplayMs: Math.max(1500, Number(map.intro_autoplay_ms) || INTRO_SETTING_DEFAULTS.autoplayMs),
    introTitle: map.intro_title ?? null,
    introSubtitle: map.intro_subtitle ?? null
  };
}
