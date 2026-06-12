import {
  fallbackCompanyProfile,
  fallbackFurnitureCategories,
  fallbackFurnitureItems,
  fallbackMaterials,
  fallbackProjects,
  fallbackServices
} from "@/lib/cms/fallback";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/cms/types";
import { BOOKING_SLOTS } from "@/lib/cms/types";
import { blockMatchesDate, slotStatesForDate } from "@/lib/booking-utils";

export type ChatLink = { label: string; href: string };

export type SiteKnowledge = {
  companyName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  services: { title: string; description: string; slug: string }[];
  categories: { name: string; slug: string }[];
  furnitureItems: { title: string; slug: string; category: string | null }[];
  materials: { name: string; slug: string; category: string | null }[];
  projects: { title: string; slug: string; location: string | null }[];
  bookingSummary: string;
  siteContent: string;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function buildBookingSummary(): Promise<string> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return "CEO meetings are available on weekdays. Open /book-meeting-with-ceo to pick a date and time.";
  }

  const month = monthKey(new Date());
  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const today = new Date().toISOString().slice(0, 10);

  const [bookingsResult, blockedResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("booking_date, start_time, status")
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .in("status", ["pending", "confirmed"]),
    supabase.from("blocked_times").select("*")
  ]);

  if (bookingsResult.error || blockedResult.error) {
    return "Book a meeting at /book-meeting-with-ceo — we confirm every request personally.";
  }

  let openDays = 0;
  let openSlots = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (date < today) continue;
    const slots = slotStatesForDate(
      date,
      blockedResult.data ?? [],
      (bookingsResult.data ?? []) as Booking[]
    );
    const available = BOOKING_SLOTS.filter((slot) => slots[slot] === "available");
    if (available.length) {
      openDays += 1;
      openSlots += available.length;
    }
  }

  if (!openSlots) {
    return `No open CEO meeting slots remain this month (${month}). Visit /book-meeting-with-ceo to check next month or leave your details.`;
  }

  return `This month (${month}) we have ${openSlots} open meeting slot(s) across ${openDays} day(s), typically ${BOOKING_SLOTS[0]}–${BOOKING_SLOTS[BOOKING_SLOTS.length - 1]}. Book at /book-meeting-with-ceo.`;
}

export async function buildSiteKnowledge(): Promise<SiteKnowledge> {
  const supabase = getSupabaseServerClient();
  const bookingSummary = await buildBookingSummary();

  if (!supabase) {
    const company = fallbackCompanyProfile;
    return {
      companyName: company.name,
      tagline: company.tagline ?? "",
      description: company.description ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      phone2: company.phone2 ?? "",
      address: company.address ?? "",
      services: fallbackServices.map((s) => ({
        title: s.title,
        description: s.description ?? "",
        slug: s.slug ?? String(s.id)
      })),
      categories: fallbackFurnitureCategories.map((c) => ({ name: c.name, slug: c.slug })),
      furnitureItems: fallbackFurnitureItems.map((item) => ({
        title: item.title,
        slug: item.slug,
        category: null
      })),
      materials: fallbackMaterials.map((m) => ({
        name: m.name,
        slug: m.slug,
        category: m.category ?? null
      })),
      projects: fallbackProjects.map((p) => ({
        title: p.title,
        slug: p.slug,
        location: p.location ?? null
      })),
      bookingSummary,
      siteContent: company.hero_subheadline ?? ""
    };
  }

  const [companyRes, servicesRes, categoriesRes, itemsRes, materialsRes, projectsRes, contentRes] =
    await Promise.all([
      supabase
        .from("company_profile")
        .select("name, tagline, description, phone, phone2, email, address, hero_subheadline, about_text")
        .eq("id", 1)
        .maybeSingle(),
      supabase.from("services").select("title, description, slug").eq("is_active", true).order("sort_order"),
      supabase.from("furniture_categories").select("name, slug").eq("published", true).order("sort_order"),
      supabase.from("furniture_items").select("title, slug").eq("published", true).order("sort_order").limit(12),
      supabase.from("materials").select("name, slug, category").eq("published", true).order("sort_order").limit(12),
      supabase
        .from("projects")
        .select("title, slug, location")
        .eq("is_published", true)
        .order("sort_order")
        .limit(8),
      supabase.from("site_content").select("title, body").limit(6)
    ]);

  const company = companyRes.data ?? fallbackCompanyProfile;
  const services =
    servicesRes.data?.length
      ? servicesRes.data
      : fallbackServices.map((s) => ({ title: s.title, description: s.description ?? "", slug: s.slug }));

  const categories =
    categoriesRes.data?.length
      ? categoriesRes.data
      : fallbackFurnitureCategories.map((c) => ({ name: c.name, slug: c.slug }));

  const furnitureItems = (itemsRes.data ?? []).map((row) => ({
    title: row.title as string,
    slug: row.slug as string,
    category: null as string | null
  }));

  const materials =
    materialsRes.data?.length
      ? materialsRes.data.map((m) => ({
          name: m.name as string,
          slug: m.slug as string,
          category: (m.category as string | null) ?? null
        }))
      : fallbackMaterials.map((m) => ({ name: m.name, slug: m.slug, category: m.category ?? null }));

  const projects =
    projectsRes.data?.length
      ? projectsRes.data.map((p) => ({
          title: p.title as string,
          slug: p.slug as string,
          location: (p.location as string | null) ?? null
        }))
      : fallbackProjects.map((p) => ({ title: p.title, slug: p.slug, location: p.location ?? null }));

  const siteContentParts: string[] = [];
  if (company.hero_subheadline) siteContentParts.push(company.hero_subheadline);
  if (company.about_text) siteContentParts.push(company.about_text);
  for (const row of contentRes.data ?? []) {
    if (row.title) siteContentParts.push(`${row.title}: ${row.body ?? ""}`.trim());
  }

  return {
    companyName: company.name ?? fallbackCompanyProfile.name,
    tagline: company.tagline ?? fallbackCompanyProfile.tagline ?? "",
    description: company.description ?? fallbackCompanyProfile.description ?? "",
    email: company.email ?? fallbackCompanyProfile.email ?? "",
    phone: company.phone ?? fallbackCompanyProfile.phone ?? "",
    phone2: company.phone2 ?? fallbackCompanyProfile.phone2 ?? "",
    address: company.address ?? fallbackCompanyProfile.address ?? "",
    services: services.map((s) => ({
      title: s.title,
      description: s.description ?? "",
      slug: s.slug ?? s.title.toLowerCase().replace(/\s+/g, "-")
    })),
    categories: categories.map((c) => ({ name: c.name, slug: c.slug })),
    furnitureItems,
    materials,
    projects,
    bookingSummary,
    siteContent: siteContentParts.join("\n")
  };
}

export function siteKnowledgeToPrompt(knowledge: SiteKnowledge): string {
  const lines: string[] = [
    `Company: ${knowledge.companyName}. ${knowledge.tagline}`,
    knowledge.description,
    `Email: ${knowledge.email}`,
    `Phone: ${knowledge.phone}${knowledge.phone2 ? ` / ${knowledge.phone2}` : ""}`,
    `Address: ${knowledge.address}`,
    "",
    `Services (${knowledge.services.length}):`,
    ...knowledge.services.map((s) => `- ${s.title}: ${s.description}`),
    "",
    `Furniture categories (${knowledge.categories.length}): ${knowledge.categories.map((c) => c.name).join(", ")}`,
    `Published furniture items (${knowledge.furnitureItems.length}): ${knowledge.furnitureItems.map((i) => i.title).join(", ") || "none listed yet"}`,
    "",
    `Materials (${knowledge.materials.length}): ${knowledge.materials.map((m) => m.name).join(", ") || "see /materials"}`,
    "",
    `Projects (${knowledge.projects.length}): ${knowledge.projects.map((p) => p.title).join(", ") || "portfolio growing"}`,
    "",
    `Booking: ${knowledge.bookingSummary}`,
    "",
    "Important links: /furniture, /materials, /projects, /services, /book-meeting-with-ceo, /contact",
    "",
    knowledge.siteContent ? `Site content:\n${knowledge.siteContent}` : ""
  ];
  return lines.filter(Boolean).join("\n");
}
