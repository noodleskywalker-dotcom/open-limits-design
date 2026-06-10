import { fallbackCompanyProfile, fallbackProjects, fallbackServices, fallbackTeam } from "./fallback";
import type {
  CompanyProfile,
  HomepageHeroImage,
  MediaAsset,
  Project,
  ProjectComparison,
  Service,
  TeamMember
} from "./types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ProjectImageRow = {
  media: MediaAsset | null;
  sort_order: number;
};

type ProjectRow = Project & {
  project_images?: ProjectImageRow[];
  project_comparisons?: ProjectComparison[];
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

function normalizeProject(project: ProjectRow): Project {
  const gallery = (project.project_images ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => item.media)
    .filter((asset): asset is MediaAsset => Boolean(asset));

  return {
    ...project,
    gallery,
    comparisons: (project.project_comparisons ?? []).sort((a, b) => a.sort_order - b.sort_order)
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

  if (error || !data) {
    return fallbackCompanyProfile;
  }

  return data as CompanyProfile;
}

export async function getHomepageHeroImages(): Promise<HomepageHeroImage[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("homepage_hero_images")
    .select("*, media:media_assets(*)")
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as HomepageHeroImage[];
}

export async function getServices(includeUnpublished = false): Promise<Service[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackServices;

  let query = supabase.from("services").select("*").order("sort_order", { ascending: true });
  if (!includeUnpublished) {
    query = query.eq("published", true);
  }

  const { data, error } = await query;
  if (error || !data) return fallbackServices;

  return data as Service[];
}

export async function getProjects(includeUnpublished = false): Promise<Project[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackProjects;

  let query = supabase.from("projects").select(projectSelect).order("sort_order", { ascending: true });
  if (!includeUnpublished) {
    query = query.eq("published", true);
  }

  const { data, error } = await query;
  if (error || !data) return fallbackProjects;

  return (data as ProjectRow[]).map(normalizeProject);
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackProjects.find((project) => project.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("projects")
    .select(projectSelect)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) return null;

  return normalizeProject(data as ProjectRow);
}

export async function getTeamMembers(includeUnpublished = false): Promise<TeamMember[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackTeam;

  let query = supabase
    .from("team_members")
    .select("*, photo:media_assets(*)")
    .order("sort_order", { ascending: true });

  if (!includeUnpublished) {
    query = query.eq("published", true);
  }

  const { data, error } = await query;
  if (error || !data) return fallbackTeam;

  return data as TeamMember[];
}
