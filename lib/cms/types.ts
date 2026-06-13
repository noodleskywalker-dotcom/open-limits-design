export const MEDIA_CATEGORIES = [
  "Architecture",
  "Projects",
  "Interior Design",
  "Furniture",
  "Materials",
  "Team",
  "CEO",
  "Company"
] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export type MediaAsset = {
  id: string;
  title: string;
  alt_text: string | null;
  category: MediaCategory;
  storage_path: string;
  public_url: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
};

// Legacy live-schema note: services/team use is_active, projects use is_published.
export type Service = {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  icon: string | null;
  image_url: string | null;
  image_id: string | null;
  sort_order: number;
  is_active: boolean;
  image?: MediaAsset | null;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  email: string | null;
  photo_url: string | null;
  photo_id: string | null;
  sort_order: number;
  is_active: boolean;
  photo?: MediaAsset | null;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  completion_date: string | null;
  cover_image_url: string | null;
  featured_image_id: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  featured_image?: MediaAsset | null;
  gallery?: MediaAsset[];
  comparisons?: ProjectComparison[];
};

export type ProjectComparison = {
  id: string;
  project_id: string;
  label: string;
  before_image_id: string;
  after_image_id: string;
  sort_order: number;
  before_image?: MediaAsset | null;
  after_image?: MediaAsset | null;
};

export type CompanyProfile = {
  id: number;
  name: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  ceo_image_id: string | null;
  ceo_name: string | null;
  ceo_bio: string | null;
  about_text: string | null;
  map_query: string | null;
  logo_image_id: string | null;
  ceo_image?: MediaAsset | null;
  logo_image?: MediaAsset | null;
};

export type IntroSettings = {
  enabled: boolean;
  autoplayMs: number;
  introTitle: string | null;
  introSubtitle: string | null;
  blueprintImageUrl: string | null;
  finalRenderImageUrl: string | null;
};

export type IntroSlide = {
  id: string;
  media_id: string;
  title: string | null;
  subtitle: string | null;
  sort_order: number;
  published: boolean;
  media?: MediaAsset | null;
};

export type ShowroomSection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_id: string | null;
  link_url: string | null;
  sort_order: number;
  published: boolean;
  image?: MediaAsset | null;
};

export type ShowroomHotspotLinkType = "furniture" | "material" | "project" | "custom";

export type ShowroomHotspot = {
  id: string;
  showroom_image_id: string;
  label: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  link_type: ShowroomHotspotLinkType;
  link_target: string;
  sort_order: number;
};

export type ShowroomImage = {
  id: string;
  section_id: string;
  media_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  published: boolean;
  media?: MediaAsset | null;
  hotspots?: ShowroomHotspot[];
};

export type HomepageHeroImage = {
  id: string;
  media_id: string;
  sort_order: number;
  media?: MediaAsset | null;
};

export type FurnitureCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  published: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Material = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  image_id: string | null;
  sort_order: number;
  published: boolean;
  image?: MediaAsset | null;
};

export type FurnitureItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  dimensions: string | null;
  width: string | null;
  depth: string | null;
  height: string | null;
  materials: string | null;
  finishes: string | null;
  features: string | null;
  availability: string | null;
  upholstery: string | null;
  collection: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  category_id: string;
  featured_image_id: string | null;
  sort_order: number;
  published: boolean;
  created_at?: string;
  updated_at?: string;
  category?: FurnitureCategory | null;
  featured_image?: MediaAsset | null;
  gallery?: MediaAsset[];
  material_records?: Material[];
};

export type BookingStatus = "pending" | "confirmed" | "rejected";

export type Booking = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  notes: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
};

export type BlockedTime = {
  id: string;
  title: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  repeat_type: "none" | "daily" | "weekly" | "monthly";
  created_at: string;
};

export const BOOKING_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00"
] as const;

/** Resolve a display URL from a CMS media record with a legacy URL fallback. */
export function resolveImageUrl(
  media: MediaAsset | null | undefined,
  legacyUrl?: string | null
): string | null {
  return media?.public_url ?? legacyUrl ?? null;
}
