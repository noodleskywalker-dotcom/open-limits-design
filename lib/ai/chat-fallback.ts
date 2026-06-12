import type { ChatPreview, ChatReplyPayload } from "@/lib/ai/chat-types";
import type { SiteKnowledge } from "@/lib/ai/chat-context";

export type { ChatReplyPayload };

const PREVIEW_LIMIT = 6;

function joinNames(items: string[], limit = 6) {
  if (!items.length) return "";
  const shown = items.slice(0, limit);
  const rest = items.length - shown.length;
  const base = shown.join(", ");
  return rest > 0 ? `${base}, and ${rest} more` : base;
}

function furniturePreviews(knowledge: SiteKnowledge): ChatPreview[] {
  return knowledge.furnitureItems.slice(0, PREVIEW_LIMIT).map((item) => {
    const meta = [item.dimensions, item.materials].filter(Boolean).join(" · ");
    return {
      title: item.title,
      subtitle: item.category,
      imageUrl: item.imageUrl,
      href: `/furniture/${item.slug}`,
      meta: meta || null,
      actionLabel: "View Item"
    };
  });
}

function materialsPreviews(knowledge: SiteKnowledge): ChatPreview[] {
  return knowledge.materials.slice(0, PREVIEW_LIMIT).map((item) => ({
    title: item.name,
    subtitle: item.category,
    imageUrl: item.imageUrl,
    href: "/materials",
    meta: item.category,
    actionLabel: "View Material"
  }));
}

function projectsPreviews(knowledge: SiteKnowledge): ChatPreview[] {
  return knowledge.projects.slice(0, PREVIEW_LIMIT).map((item) => ({
    title: item.title,
    subtitle: item.location,
    imageUrl: item.imageUrl,
    href: `/projects/${item.slug}`,
    meta: item.location,
    actionLabel: "View Project"
  }));
}

function servicesPreviews(knowledge: SiteKnowledge): ChatPreview[] {
  return knowledge.services.slice(0, PREVIEW_LIMIT).map((item) => ({
    title: item.title,
    subtitle: null,
    imageUrl: item.imageUrl,
    href: "/services",
    meta: item.description.slice(0, 80) || null,
    actionLabel: "View Service"
  }));
}

function bookingPreviews(knowledge: SiteKnowledge): ChatPreview[] {
  const previews: ChatPreview[] = knowledge.booking.dates.slice(0, 5).map((entry) => ({
    title: entry.date,
    subtitle: `${entry.slots.length} open slot${entry.slots.length === 1 ? "" : "s"}`,
    imageUrl: null,
    href: `/book-meeting-with-ceo?date=${entry.date}`,
    meta: entry.slots.join(", "),
    actionLabel: "Book This Date"
  }));

  previews.push({
    title: "Book Meeting",
    subtitle: "View full availability",
    imageUrl: null,
    href: "/book-meeting-with-ceo",
    meta: null,
    actionLabel: "View Availability"
  });

  return previews;
}

function furnitureReply(knowledge: SiteKnowledge): ChatReplyPayload {
  const { counts, categories } = knowledge;
  const categoryNames = categories.map((c) => `${c.name} (${c.itemCount})`);

  let reply = knowledge.live
    ? `Live catalog: ${counts.categories} categor${counts.categories === 1 ? "y" : "ies"}, ${counts.furnitureItems} published item${counts.furnitureItems === 1 ? "" : "s"}.`
    : "Supabase is not connected — connect your CMS to load the live furniture catalog.";

  if (categoryNames.length) {
    reply += `\n\nCategories: ${joinNames(categoryNames, 8)}.`;
  }

  if (knowledge.furnitureItems.length) {
    reply += "\n\nTap any item below for dimensions, materials, and gallery images.";
  } else if (knowledge.live) {
    reply += "\n\nNo furniture items are published yet. Add items in Admin → Furniture.";
  }

  const links = [
    { label: "View Furniture Catalog", href: "/furniture" },
    { label: "Furniture Showroom", href: "/showroom/furniture" }
  ];

  for (const item of knowledge.furnitureItems.slice(0, 4)) {
    links.push({ label: item.title, href: `/furniture/${item.slug}` });
  }

  return {
    reply,
    links,
    previews: furniturePreviews(knowledge),
    source: "cms"
  };
}

function materialsReply(knowledge: SiteKnowledge): ChatReplyPayload {
  const { counts } = knowledge;
  const names = knowledge.materials.map((m) => m.name);

  let reply = knowledge.live
    ? `Live material library: ${counts.materials} published finish${counts.materials === 1 ? "" : "es"}.`
    : "Connect Supabase to load the live materials library.";

  if (names.length) {
    reply += `\n\n${joinNames(names, 10)}.`;
  } else if (knowledge.live) {
    reply += "\n\nNo materials published yet — add them in Admin → Materials.";
  }

  reply += "\n\nMaterials can be linked to furniture pieces for in-context swatch comparison.";

  const links = [{ label: "Browse Materials", href: "/materials" }];
  for (const item of knowledge.materials.slice(0, 4)) {
    links.push({ label: item.name, href: "/materials" });
  }

  return {
    reply,
    links,
    previews: materialsPreviews(knowledge),
    source: "cms"
  };
}

function projectsReply(knowledge: SiteKnowledge): ChatReplyPayload {
  const { counts } = knowledge;

  if (!knowledge.live) {
    return {
      reply: "Connect Supabase to load the live project portfolio.",
      links: [{ label: "View Projects", href: "/projects" }],
      previews: [],
      source: "cms"
    };
  }

  if (!counts.projects) {
    return {
      reply:
        "No projects are published in the CMS yet. Add portfolio entries in Admin → Projects — each includes imagery, scope, and delivery details.",
      links: [
        { label: "View Projects", href: "/projects" },
        { label: "Projects Showroom", href: "/showroom/projects" }
      ],
      previews: [],
      source: "cms"
    };
  }

  const highlights = knowledge.projects
    .slice(0, 5)
    .map((p) => (p.location ? `${p.title} (${p.location})` : p.title));

  const reply = `Live portfolio: ${counts.projects} published project${counts.projects === 1 ? "" : "s"} — ${joinNames(highlights, 5)}.`;

  const links = [
    { label: "View Projects", href: "/projects" },
    { label: "Projects Showroom", href: "/showroom/projects" }
  ];
  for (const project of knowledge.projects.slice(0, 4)) {
    links.push({ label: project.title, href: `/projects/${project.slug}` });
  }

  return {
    reply,
    links,
    previews: projectsPreviews(knowledge),
    source: "cms"
  };
}

function servicesReply(knowledge: SiteKnowledge): ChatReplyPayload {
  const lines = knowledge.services.map((s) => `${s.title} — ${s.description}`);
  const reply =
    knowledge.live && lines.length > 0
      ? `Live services (${knowledge.counts.services}):\n\n${lines.join("\n")}\n\nShare your project type and location for a tailored next step.`
      : knowledge.live
        ? "No active services in the CMS yet. Add them in Admin → Services."
        : "Connect Supabase to load live services.";

  const links = [
    { label: "View Services", href: "/services" },
    { label: "Book a Meeting", href: "/book-meeting-with-ceo" }
  ];

  return {
    reply,
    links,
    previews: servicesPreviews(knowledge),
    source: "cms"
  };
}

function bookingReply(knowledge: SiteKnowledge): ChatReplyPayload {
  const dateLines = knowledge.booking.dates
    .slice(0, 5)
    .map((d) => `• ${d.date}: ${d.slots.join(", ")}`);

  let reply = knowledge.booking.summary;
  if (dateLines.length) {
    reply += `\n\nAvailable dates:\n${dateLines.join("\n")}`;
  }
  reply += "\n\nChoose a date, pick an hourly slot, and leave your contact details — our team confirms every request.";

  return {
    reply,
    links: [{ label: "Book a Meeting", href: "/book-meeting-with-ceo" }],
    previews: bookingPreviews(knowledge),
    source: "cms"
  };
}

function contactReply(knowledge: SiteKnowledge): ChatReplyPayload {
  const parts = [`${knowledge.companyName}${knowledge.address ? ` — ${knowledge.address}` : ""}.`];
  if (knowledge.email) parts.push(`Email: ${knowledge.email}`);
  if (knowledge.phone) parts.push(`Phone: ${knowledge.phone}`);
  if (knowledge.phone2) parts.push(`Alt: ${knowledge.phone2}`);

  return {
    reply: parts.join(" "),
    links: [
      { label: "Contact Page", href: "/contact" },
      { label: "Location", href: "/location" },
      { label: "Book a Meeting", href: "/book-meeting-with-ceo" }
    ],
    previews: [],
    source: "cms"
  };
}

function pricingReply(): ChatReplyPayload {
  return {
    reply:
      "Pricing depends on project type, size, materials, design complexity, location, timeline, and furniture or fit-out scope — we don't publish fixed price lists. Share approximate area, location, and scope for a tailored proposal, or book a CEO meeting.",
    links: [{ label: "Book a Meeting", href: "/book-meeting-with-ceo" }],
    previews: [],
    source: "cms"
  };
}

function variedUnknownReply(question: string, knowledge: SiteKnowledge): ChatReplyPayload {
  const q = question.toLowerCase();
  const hints: string[] = [];

  if (/design|luxury|studio|open limits/.test(q)) {
    hints.push(`${knowledge.companyName} is a luxury architecture, interior, and furniture studio in Qatar.`);
  }
  if (/hello|hi|hey|good/.test(q)) {
    hints.push("Hello — ask about catalog, materials, projects, services, or book a CEO meeting.");
  }
  if (/showroom|virtual|tour/.test(q)) {
    hints.push("Try our interactive showrooms — Architecture, Projects, Furniture, and Interior Design.");
  }

  if (!hints.length) {
    if (knowledge.live) {
      hints.push(
        `Live CMS: ${knowledge.counts.categories} furniture categories, ${knowledge.counts.furnitureItems} items, ${knowledge.counts.materials} materials, ${knowledge.counts.projects} projects. Try "catalog", "materials", "projects", "booking", or "services".`
      );
    } else {
      hints.push('Connect Supabase to enable live CMS answers. Try "catalog", "materials", "projects", "booking", or "services".');
    }
  }

  return {
    reply: hints.join(" "),
    links: [
      { label: "Furniture Catalog", href: "/furniture" },
      { label: "Book a Meeting", href: "/book-meeting-with-ceo" }
    ],
    previews: [],
    source: "cms"
  };
}

export function detectIntent(question: string): string | null {
  const q = question.toLowerCase().trim();
  if (/^catalog$|catalog|furniture catalog|browse furniture|view furniture|show furniture/.test(q)) return "furniture";
  if (/^furniture$|sofa|majlis|chair|table|bed|cabinet|upholstery|bedroom collection/.test(q)) return "furniture";
  if (/^materials$|material library|marble|leather|fabric|wood|oak|walnut|brass|finish|swatch/.test(q)) return "materials";
  if (/^projects$|portfolio|case study|completed work|our work/.test(q)) return "projects";
  if (/^booking$|book a meeting|book meeting|appointment|schedule|calendar|ceo meeting|meet the ceo/.test(q)) return "booking";
  if (/^services$|architecture|interior design|fit.?out|construction|what do you offer|what do you do/.test(q)) return "services";
  if (/price|cost|quote|budget|how much/.test(q)) return "pricing";
  if (/contact|phone|email|address|location|reach|call/.test(q)) return "contact";
  if (/custom furniture|bespoke|made.?to.?order/.test(q)) return "furniture";
  return null;
}

export function buildCmsReply(question: string, knowledge: SiteKnowledge): ChatReplyPayload {
  const intent = detectIntent(question);

  switch (intent) {
    case "furniture": {
      const reply = furnitureReply(knowledge);
      if (/custom furniture|bespoke|made.?to.?order/.test(question.toLowerCase())) {
        return { ...reply, reply: `Yes — we design and supply bespoke furniture.\n\n${reply.reply}` };
      }
      return reply;
    }
    case "materials":
      return materialsReply(knowledge);
    case "projects":
      return projectsReply(knowledge);
    case "booking":
      return bookingReply(knowledge);
    case "services":
      return servicesReply(knowledge);
    case "pricing":
      return pricingReply();
    case "contact":
      return contactReply(knowledge);
    default:
      if (/international|outside qatar|abroad/.test(question.toLowerCase())) {
        return {
          reply:
            "We are headquartered in Lusail, Qatar and deliver across the region. For select international scopes we can discuss remote design and supply — share your location and project size.",
          links: [{ label: "Contact Us", href: "/contact" }],
          previews: [],
          source: "cms"
        };
      }
      return variedUnknownReply(question, knowledge);
  }
}

export function previewsForIntent(intent: string | null, knowledge: SiteKnowledge): ChatPreview[] {
  switch (intent) {
    case "furniture":
      return furniturePreviews(knowledge);
    case "materials":
      return materialsPreviews(knowledge);
    case "projects":
      return projectsPreviews(knowledge);
    case "services":
      return servicesPreviews(knowledge);
    case "booking":
      return bookingPreviews(knowledge);
    default:
      return [];
  }
}

/** @deprecated use buildCmsReply */
export function buildFallbackReply(question: string, knowledge: SiteKnowledge): ChatReplyPayload {
  return buildCmsReply(question, knowledge);
}
