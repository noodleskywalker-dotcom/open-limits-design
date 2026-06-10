import type { CompanyProfile, MediaAsset, Project, Service, TeamMember } from "./types";

export const fallbackMedia: MediaAsset[] = [];

export const fallbackCompanyProfile: CompanyProfile = {
  id: 1,
  name: "Open Limits Design",
  tagline: "Architecture, interiors, furniture, and project delivery.",
  description:
    "A design studio for high-end architecture, interior design, furniture, and company projects.",
  address: null,
  phone: null,
  email: null,
  hero_headline: "Design without limits",
  hero_subheadline:
    "Manage images, projects, team profiles, services, and company content from one Supabase-powered dashboard.",
  ceo_image_id: null,
  ceo_image: null
};

export const fallbackServices: Service[] = [
  {
    id: "architecture",
    title: "Architecture",
    description: "Concept, design development, and delivery for residential and commercial spaces.",
    icon: "A",
    sort_order: 1,
    published: true
  },
  {
    id: "interior-design",
    title: "Interior Design",
    description: "Material palettes, spatial planning, FF&E, and turnkey interior experiences.",
    icon: "I",
    sort_order: 2,
    published: true
  },
  {
    id: "furniture",
    title: "Furniture",
    description: "Custom furniture direction and curated pieces for complete environments.",
    icon: "F",
    sort_order: 3,
    published: true
  }
];

export const fallbackProjects: Project[] = [];

export const fallbackTeam: TeamMember[] = [];
