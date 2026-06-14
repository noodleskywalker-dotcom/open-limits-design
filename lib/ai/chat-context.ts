import type { BookingAvailability } from "@/lib/ai/chat-types";
import type { Booking, FurnitureCategory, FurnitureItem, Material, Project } from "@/lib/cms/types";
import { BOOKING_SLOTS, resolveImageUrl } from "@/lib/cms/types";
import { slotStatesForDate } from "@/lib/booking-utils";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type { ChatLink, ChatPreview, ChatReplyPayload } from "@/lib/ai/chat-types";

export type SiteKnowledge = {
  live: boolean;
  companyName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  counts: {
    categories: number;
    furnitureItems: number;
    materials: number;
    projects: number;
    services: number;
    teamMembers: number;
  };
  services: { title: string; description: string; slug: string; imageUrl: string | null }[];
  categories: { name: string; slug: string; itemCount: number }[];
  furnitureItems: {
    title: string;
    slug: string;
    category: string | null;
    dimensions: string | null;
    materials: string | null;
    imageUrl: string | null;
  }[];
  materials: {
    name: string;
    slug: string;
    category: string | null;
    imageUrl: string | null;
  }[];
  projects: {
    title: string;
    slug: string;
    location: string | null;
    imageUrl: string | null;
  }[];
  teamMembers: { name: string; role: string }[];
  homepageContent: { heroTitle: string | null; heroSubtitle: string | null; aboutText: string | null };
  siteContent: { sectionKey: string; title: string | null; body: string | null }[];
  booking: BookingAvailability;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDimensions(item: FurnitureItem): string | null {
  if (item.dimensions?.trim()) return item.dimensions.trim();
  const parts = [item.width, item.depth, item.height].filter(Boolean);
  return parts.length ? parts.join(" × ") : null;
}

function formatMaterials(item: FurnitureItem): string | null {
  if (item.materials?.trim()) return item.materials.trim();
  const linked = item.material_records?.map((m) => m.name).filter(Boolean);
  return linked?.length ? linked.join(", ") : null;
}

type FurnitureItemRow = FurnitureItem & {
  category?: FurnitureCategory | null;
  featured_image?: { public_url: string } | null;
  furniture_item_materials?: { material: Material | null }[];
};

function normalizeFurnitureRow(row: FurnitureItemRow): FurnitureItem {
  return {
    ...row,
    material_records: (row.furniture_item_materials ?? [])
      .map((entry) => entry.material)
      .filter((material): material is Material => Boolean(material))
  };
}

const furnitureSelect = `
  *,
  category:furniture_categories(*),
  featured_image:media_assets!furniture_items_featured_image_id_fkey(*),
  furniture_item_materials(material:materials(*))
`;

const projectSelect = `
  *,
  featured_image:media_assets!projects_featured_image_id_fkey(*)
`;

function emptyKnowledge(): SiteKnowledge {
  return {
    live: false,
    companyName: "Open Limits Design",
    tagline: "",
    description: "",
    email: "",
    phone: "",
    phone2: "",
    address: "",
    counts: { categories: 0, furnitureItems: 0, materials: 0, projects: 0, services: 0, teamMembers: 0 },
    services: [],
    categories: [],
    furnitureItems: [],
    materials: [],
    projects: [],
    teamMembers: [],
    homepageContent: { heroTitle: null, heroSubtitle: null, aboutText: null },
    siteContent: [],
    booking: {
      summary: "Connect Supabase to load live booking availability.",
      openSlotCount: 0,
      openDayCount: 0,
      dates: []
    }
  };
}

async function buildBookingAvailability(): Promise<BookingAvailability> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return {
      summary: "CEO meetings are available on weekdays. Open the booking page to pick a date and time.",
      openSlotCount: 0,
      openDayCount: 0,
      dates: []
    };
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
    return {
      summary: "Book a meeting — we confirm every request personally.",
      openSlotCount: 0,
      openDayCount: 0,
      dates: []
    };
  }

  const dates: { date: string; slots: string[] }[] = [];
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
      dates.push({ date, slots: [...available] });
    }
  }

  if (!openSlots) {
    return {
      summary: `No open CEO meeting slots remain this month (${month}). Visit the booking page to check next month.`,
      openSlotCount: 0,
      openDayCount: 0,
      dates: []
    };
  }

  const datePreview = dates
    .slice(0, 5)
    .map((d) => `${d.date} (${d.slots.length} slot${d.slots.length === 1 ? "" : "s"})`)
    .join(", ");

  return {
    summary: `This month (${month}): ${openSlots} open slot${openSlots === 1 ? "" : "s"} across ${openDays} day${openDays === 1 ? "" : "s"}. Next dates: ${datePreview}.`,
    openSlotCount: openSlots,
    openDayCount: openDays,
    dates
  };
}

export async function buildSiteKnowledge(): Promise<SiteKnowledge> {
  const supabase = getSupabaseServerClient();
  const booking = await buildBookingAvailability();

  if (!supabase) {
    return { ...emptyKnowledge(), booking };
  }

  const [
    companyRes,
    servicesRes,
    categoriesRes,
    furnitureRes,
    materialsRes,
    projectsRes,
    teamRes,
    homepageRes,
    siteContentRes
  ] = await Promise.all([
    supabase
      .from("company_profile")
      .select("name, tagline, description, phone, phone2, email, address, hero_headline, hero_subheadline, about_text")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("services").select("title, description, slug, image_url, image:media_assets(*)").eq("is_active", true).order("sort_order"),
    supabase.from("furniture_categories").select("*").eq("published", true).order("sort_order"),
    supabase.from("furniture_items").select(furnitureSelect).eq("published", true).order("sort_order"),
    supabase.from("materials").select("*, image:media_assets(*)").eq("published", true).order("sort_order"),
    supabase.from("projects").select(projectSelect).eq("is_published", true).order("sort_order"),
    supabase.from("team_members").select("name, role").eq("is_active", true).order("sort_order"),
    supabase.from("homepage_content").select("hero_title, hero_subtitle, about_text").eq("id", 1).maybeSingle(),
    supabase.from("site_content").select("section_key, title, body").order("section_key")
  ]);

  const company = companyRes.data;
  const services = (servicesRes.data ?? []) as unknown as {
    title: string;
    description: string | null;
    slug: string | null;
    image_url: string | null;
    image?: { public_url: string } | null;
  }[];
  const categories = (categoriesRes.data ?? []) as FurnitureCategory[];
  const furnitureItems = ((furnitureRes.data ?? []) as FurnitureItemRow[]).map(normalizeFurnitureRow);
  const materials = (materialsRes.data ?? []) as (Material & { image?: { public_url: string } | null })[];
  const projects = (projectsRes.data ?? []) as (Project & { featured_image?: { public_url: string } | null })[];
  const teamMembers = (teamRes.data ?? []) as { name: string; role: string }[];

  const categoryItemCounts = new Map<string, number>();
  for (const item of furnitureItems) {
    const catId = item.category_id;
    categoryItemCounts.set(catId, (categoryItemCounts.get(catId) ?? 0) + 1);
  }

  return {
    live: true,
    companyName: company?.name ?? "Open Limits Design",
    tagline: company?.tagline ?? "",
    description: company?.description ?? "",
    email: company?.email ?? "",
    phone: company?.phone ?? "",
    phone2: company?.phone2 ?? "",
    address: company?.address ?? "",
    counts: {
      categories: categories.length,
      furnitureItems: furnitureItems.length,
      materials: materials.length,
      projects: projects.length,
      services: services.length,
      teamMembers: teamMembers.length
    },
    services: services.map((s) => ({
      title: s.title,
      description: s.description ?? "",
      slug: s.slug ?? s.title.toLowerCase().replace(/\s+/g, "-"),
      imageUrl: resolveImageUrl(s.image as Parameters<typeof resolveImageUrl>[0], s.image_url)
    })),
    categories: categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      itemCount: categoryItemCounts.get(c.id) ?? 0
    })),
    furnitureItems: furnitureItems.map((item) => ({
      title: item.title,
      slug: item.slug,
      category: item.category?.name ?? null,
      dimensions: formatDimensions(item),
      materials: formatMaterials(item),
      imageUrl: resolveImageUrl(item.featured_image, null)
    })),
    materials: materials.map((m) => ({
      name: m.name,
      slug: m.slug,
      category: m.category ?? null,
      imageUrl: resolveImageUrl(m.image as Parameters<typeof resolveImageUrl>[0], null)
    })),
    projects: projects.map((p) => ({
      title: p.title,
      slug: p.slug,
      location: p.location ?? null,
      imageUrl: resolveImageUrl(p.featured_image as Parameters<typeof resolveImageUrl>[0], p.cover_image_url)
    })),
    teamMembers: teamMembers.map((m) => ({ name: m.name, role: m.role })),
    homepageContent: {
      heroTitle: homepageRes.data?.hero_title ?? company?.hero_headline ?? null,
      heroSubtitle: homepageRes.data?.hero_subtitle ?? company?.hero_subheadline ?? null,
      aboutText: homepageRes.data?.about_text ?? company?.about_text ?? null
    },
    siteContent: (siteContentRes.data ?? []).map((row) => ({
      sectionKey: row.section_key as string,
      title: (row.title as string | null) ?? null,
      body: (row.body as string | null) ?? null
    })),
    booking
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
    `COUNTS — categories: ${knowledge.counts.categories}, furniture items: ${knowledge.counts.furnitureItems}, materials: ${knowledge.counts.materials}, projects: ${knowledge.counts.projects}, services: ${knowledge.counts.services}, team: ${knowledge.counts.teamMembers}`,
    "",
    `Services (${knowledge.counts.services}):`,
    ...knowledge.services.map((s) => `- ${s.title}: ${s.description}`),
    "",
    `Furniture categories (${knowledge.counts.categories}):`,
    ...knowledge.categories.map((c) => `- ${c.name} (${c.itemCount} item${c.itemCount === 1 ? "" : "s"})`),
    "",
    `Furniture catalog (${knowledge.counts.furnitureItems} published):`,
    ...knowledge.furnitureItems.map((item) => {
      const parts = [item.category, item.dimensions, item.materials].filter(Boolean);
      return `- ${item.title}${parts.length ? ` — ${parts.join(" · ")}` : ""} (/furniture/${item.slug})`;
    }),
    "",
    `Materials (${knowledge.counts.materials}):`,
    ...knowledge.materials.map((m) => `- ${m.name}${m.category ? ` (${m.category})` : ""}`),
    "",
    `Projects (${knowledge.counts.projects}):`,
    ...knowledge.projects.map((p) => `- ${p.title}${p.location ? ` — ${p.location}` : ""} (/projects/${p.slug})`),
    "",
    knowledge.teamMembers.length
      ? `Team (${knowledge.counts.teamMembers}):\n${knowledge.teamMembers.map((m) => `- ${m.name}, ${m.role}`).join("\n")}`
      : "",
    "",
    knowledge.homepageContent.heroTitle ? `Homepage hero: ${knowledge.homepageContent.heroTitle}` : "",
    knowledge.homepageContent.heroSubtitle ?? "",
    knowledge.homepageContent.aboutText ? `About: ${knowledge.homepageContent.aboutText}` : "",
    "",
    knowledge.siteContent.length
      ? `Site content sections:\n${knowledge.siteContent.map((s) => `- ${s.sectionKey}: ${s.title ?? ""} ${s.body ?? ""}`.trim()).join("\n")}`
      : "",
    "",
    `Booking: ${knowledge.booking.summary}`,
    knowledge.booking.dates.length
      ? `Available dates:\n${knowledge.booking.dates
          .slice(0, 8)
          .map((d) => `- ${d.date}: ${d.slots.join(", ")}`)
          .join("\n")}`
      : "",
    "",
    "Important links: /furniture, /materials, /projects, /services, /book-meeting-with-ceo, /contact, /location"
  ];
  return lines.filter(Boolean).join("\n");
}
