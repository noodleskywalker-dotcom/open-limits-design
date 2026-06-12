export type ChatLink = { label: string; href: string };

export type ChatPreview = {
  title: string;
  subtitle?: string | null;
  imageUrl: string | null;
  href: string;
  meta?: string | null;
  actionLabel?: string;
};

export type ChatReplyPayload = {
  reply: string;
  links: ChatLink[];
  previews: ChatPreview[];
  source: "openai" | "cms" | "fallback";
};

export type BookingAvailability = {
  summary: string;
  openSlotCount: number;
  openDayCount: number;
  dates: { date: string; slots: string[] }[];
};
