import type { ChatLink } from "@/lib/ai/chat-context";
import type { SiteKnowledge } from "@/lib/ai/chat-context";

export type ChatReply = {
  reply: string;
  links: ChatLink[];
};

function joinNames(items: string[], limit = 6) {
  if (!items.length) return "";
  const shown = items.slice(0, limit);
  const rest = items.length - shown.length;
  const base = shown.join(", ");
  return rest > 0 ? `${base}, and ${rest} more` : base;
}

function furnitureReply(knowledge: SiteKnowledge): ChatReply {
  const count = knowledge.categories.length;
  const names = knowledge.categories.map((c) => c.name);
  const itemCount = knowledge.furnitureItems.length;
  const sampleItems = knowledge.furnitureItems.slice(0, 4).map((i) => i.title);

  let reply = `We currently have ${count} furniture categor${count === 1 ? "y" : "ies"}`;
  if (names.length) {
    reply += `: ${joinNames(names, 8)}.`;
  } else {
    reply += ".";
  }

  if (itemCount) {
    reply += ` ${itemCount} piece${itemCount === 1 ? "" : "s"} ${itemCount === 1 ? "is" : "are"} published in the catalog`;
    if (sampleItems.length) reply += ` — including ${joinNames(sampleItems, 4)}`;
    reply += ". Each item lists dimensions, materials, finishes, and gallery images.";
  } else {
    reply += " Browse the catalog to explore majlis seating, bedrooms, dining, and bespoke commissions.";
  }

  reply += " Open the furniture catalog for photos, specs, and showroom hotspots.";

  return {
    reply,
    links: [
      { label: "View Furniture Catalog", href: "/furniture" },
      { label: "Furniture Showroom", href: "/showroom/furniture" }
    ]
  };
}

function materialsReply(knowledge: SiteKnowledge): ChatReply {
  const names = knowledge.materials.map((m) => m.name);
  const count = names.length;

  let reply =
    count > 0
      ? `Our material library includes ${count} curated finish${count === 1 ? "" : "es"}: ${joinNames(names, 10)}.`
      : "Explore our material library for wood, stone, upholstery, and metal finishes used across furniture and interiors.";

  reply += " Materials can be linked to furniture pieces so clients can compare swatches in context.";

  return {
    reply,
    links: [{ label: "Browse Materials", href: "/materials" }]
  };
}

function projectsReply(knowledge: SiteKnowledge): ChatReply {
  const count = knowledge.projects.length;

  if (!count) {
    return {
      reply:
        "Our project portfolio highlights completed architecture and interior work across Qatar. Visit the projects page for case studies, galleries, and before/after comparisons as they are published.",
      links: [
        { label: "View Projects", href: "/projects" },
        { label: "Projects Showroom", href: "/showroom/projects" }
      ]
    };
  }

  const highlights = knowledge.projects
    .slice(0, 5)
    .map((p) => (p.location ? `${p.title} (${p.location})` : p.title));

  return {
    reply: `We showcase ${count} published project${count === 1 ? "" : "s"} — ${joinNames(highlights, 5)}. Each project page includes imagery, scope, and delivery details.`,
    links: [
      { label: "View Projects", href: "/projects" },
      ...(knowledge.projects[0]
        ? [{ label: `Open ${knowledge.projects[0].title}`, href: `/projects/${knowledge.projects[0].slug}` }]
        : [])
    ]
  };
}

function servicesReply(knowledge: SiteKnowledge): ChatReply {
  const lines = knowledge.services.map((s) => `${s.title} — ${s.description}`);
  const reply =
    lines.length > 0
      ? `Open Limits Design offers ${knowledge.services.length} core services:\n\n${lines.join("\n")}\n\nTell me your project type and location and I can point you to the right next step.`
      : "We deliver architecture, interior design, bespoke furniture, and turnkey fit-out. Share your project scope and we'll guide you.";

  return {
    reply,
    links: [
      { label: "View Services", href: "/services" },
      { label: "Book a Meeting", href: "/book-meeting-with-ceo" }
    ]
  };
}

function bookingReply(knowledge: SiteKnowledge): ChatReply {
  return {
    reply: `${knowledge.bookingSummary}\n\nChoose a date, pick an hourly slot, and leave your contact details — our team confirms every request.`,
    links: [{ label: "Book a Meeting", href: "/book-meeting-with-ceo" }]
  };
}

function contactReply(knowledge: SiteKnowledge): ChatReply {
  const parts = [`${knowledge.companyName} is based in Lusail, Qatar.`];
  if (knowledge.email) parts.push(`Email: ${knowledge.email}`);
  if (knowledge.phone) parts.push(`Phone: ${knowledge.phone}`);
  if (knowledge.phone2) parts.push(`Alt: ${knowledge.phone2}`);
  if (knowledge.address) parts.push(`Studio: ${knowledge.address}`);

  return {
    reply: parts.join(" "),
    links: [
      { label: "Contact Page", href: "/contact" },
      { label: "Book a Meeting", href: "/book-meeting-with-ceo" }
    ]
  };
}

function pricingReply(): ChatReply {
  return {
    reply:
      "Pricing depends on project type, size, materials, design complexity, location, timeline, and furniture or fit-out scope — we don't publish fixed price lists. Share approximate area, location, and what you need (architecture, interiors, furniture, or full delivery) and we can outline the process, or book a CEO meeting for a tailored proposal.",
    links: [{ label: "Book a Meeting", href: "/book-meeting-with-ceo" }]
  };
}

function variedUnknownReply(question: string, knowledge: SiteKnowledge): ChatReply {
  const q = question.toLowerCase();
  const hints: string[] = [];

  if (/design|luxury|studio|open limits/.test(q)) {
    hints.push(`${knowledge.companyName} is a luxury architecture, interior, and furniture studio in Qatar.`);
  }
  if (/hello|hi|hey|good/.test(q)) {
    hints.push("Hello — I'm here to help you explore our catalog, materials, projects, services, or book time with our CEO.");
  }
  if (/showroom|virtual|tour/.test(q)) {
    hints.push("Try our interactive showrooms from the homepage — Architecture, Projects, Furniture, and Interior Design.");
  }

  if (!hints.length) {
    const options = [
      `I can pull live info from our CMS — try "catalog", "materials", "projects", "booking", or "services".`,
      `Ask about furniture categories (${knowledge.categories.length} live), materials, portfolio projects, or CEO meeting availability.`,
      `Not sure where to start? Browse ${knowledge.categories.length} furniture categories or book a consultation at /book-meeting-with-ceo.`
    ];
    hints.push(options[question.length % options.length]);
  }

  return {
    reply: hints.join(" "),
    links: [
      { label: "Furniture Catalog", href: "/furniture" },
      { label: "Book a Meeting", href: "/book-meeting-with-ceo" }
    ]
  };
}

export function buildFallbackReply(question: string, knowledge: SiteKnowledge): ChatReply {
  const q = question.toLowerCase().trim();

  if (/^catalog$|catalog|furniture catalog|browse furniture|view furniture|show furniture/.test(q)) {
    return furnitureReply(knowledge);
  }
  if (/^furniture$|sofa|majlis|chair|table|bed|cabinet|upholstery|bedroom collection/.test(q)) {
    return furnitureReply(knowledge);
  }
  if (/^materials$|material library|marble|leather|fabric|wood|oak|walnut|brass|finish|swatch/.test(q)) {
    return materialsReply(knowledge);
  }
  if (/^projects$|portfolio|case study|completed work|our work/.test(q)) {
    return projectsReply(knowledge);
  }
  if (/^booking$|book a meeting|book meeting|appointment|schedule|calendar|ceo meeting|meet the ceo/.test(q)) {
    return bookingReply(knowledge);
  }
  if (/^services$|architecture|interior design|fit.?out|construction|what do you offer|what do you do/.test(q)) {
    return servicesReply(knowledge);
  }
  if (/price|cost|quote|budget|how much/.test(q)) {
    return pricingReply();
  }
  if (/contact|phone|email|address|location|reach|call/.test(q)) {
    return contactReply(knowledge);
  }
  if (/custom furniture|bespoke|made.?to.?order/.test(q)) {
    const reply = furnitureReply(knowledge);
    return {
      reply: `Yes — we design and supply bespoke furniture. ${reply.reply}`,
      links: reply.links
    };
  }
  if (/international|outside qatar|abroad/.test(q)) {
    return {
      reply:
        "We are headquartered in Lusail, Qatar and deliver across the region. For select international scopes we can discuss remote design and supply — share your location and project size.",
      links: [{ label: "Contact Us", href: "/contact" }]
    };
  }

  return variedUnknownReply(question, knowledge);
}
