"use client";

type OverviewStats = {
  pendingBookings: number;
  confirmedBookings: number;
  furnitureItems: number;
  projects: number;
  media: number;
};

type AdminOverviewProps = {
  stats: OverviewStats;
  onNavigate: (tab: string) => void;
};

export default function AdminOverview({ stats, onNavigate }: AdminOverviewProps) {
  const cards = [
    { label: "Pending bookings", value: stats.pendingBookings, tab: "bookings", hint: "Review requests" },
    { label: "Confirmed bookings", value: stats.confirmedBookings, tab: "bookings", hint: "Upcoming meetings" },
    { label: "Furniture items", value: stats.furnitureItems, tab: "furniture", hint: "Catalog entries" },
    { label: "Projects", value: stats.projects, tab: "projects", hint: "Portfolio entries" },
    { label: "Uploaded media", value: stats.media, tab: "media", hint: "Library assets" }
  ];

  return (
    <section className="admin-overview">
      <div className="admin-overview-header">
        <p className="eyebrow">Dashboard</p>
        <h2>At a glance</h2>
        <p className="meta">Quick counts across bookings, catalog, and media.</p>
      </div>
      <div className="admin-overview-grid">
        {cards.map((card) => (
          <button
            className="admin-overview-card"
            key={card.label}
            onClick={() => onNavigate(card.tab)}
            type="button"
          >
            <span className="admin-overview-value">{card.value}</span>
            <strong>{card.label}</strong>
            <span className="meta">{card.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
