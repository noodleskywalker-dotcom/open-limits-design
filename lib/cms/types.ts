export const MEDIA_CATEGORIES = [
  "Architecture",
  "Projects",
  "Interior Design",
  "Furniture",
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

export type Project = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string | null;
  completion_date: string | null;
  featured_image_id: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
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

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  email: string | null;
  photo_id: string | null;
  sort_order: number;
  published: boolean;
  photo?: MediaAsset | null;
};

export type Service = {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  sort_order: number;
  published: boolean;
};

export type CompanyProfile = {
  id: number;
  name: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  ceo_image_id: string | null;
  ceo_image?: MediaAsset | null;
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
  created_at: string;
  updated_at: string;
};

export type FurnitureItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  dimensions: string | null;
  materials: string | null;
  category_id: string;
  featured_image_id: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
  category?: FurnitureCategory | null;
  featured_image?: MediaAsset | null;
  gallery?: MediaAsset[];
};
