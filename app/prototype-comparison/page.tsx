import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import {
  CINEMATIC_CONS,
  CINEMATIC_METRICS,
  CINEMATIC_PROS,
  COMPARISON_TABLE,
  RECOMMENDATION_NOTE,
  SIGNATURE_CONS,
  SIGNATURE_METRICS,
  SIGNATURE_PROS
} from "@/lib/prototype/comparison-metrics";

export const metadata = {
  title: "Intro Prototype Comparison — Open Limits Design",
  robots: { index: false, follow: false }
};

type BundleMeasurements = {
  measuredAt?: string;
  note?: string;
  cinematic?: { serverRouteKb?: number; sharedStaticChunksDirKb?: number };
  signature?: { serverRouteKb?: number; sharedStaticChunksDirKb?: number };
  framerMotionDistKb?: number;
};

function loadBundleMeasurements(): BundleMeasurements | null {
  try {
    const file = path.join(process.cwd(), "lib/prototype/bundle-measurements.json");
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as BundleMeasurements;
  } catch {
    return null;
  }
}

export default function PrototypeComparisonPage() {
  const bundles = loadBundleMeasurements();

  return (
    <main className="page prototype-comparison-page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Internal review · Not deployed</p>
            <h1>Intro prototype comparison</h1>
            <p>
              Side-by-side review of PR #9 cinematic intro vs. signature storytelling vision.
              Homepage unchanged. Do not merge without architect sign-off.
            </p>
          </div>
          <div className="button-row">
            <Link className="button" href="/prototype/current-cinematic" target="_blank">
              Open cinematic
            </Link>
            <Link className="button ghost" href="/prototype/signature-open-limits" target="_blank">
              Open signature
            </Link>
          </div>
        </div>

        <div className="prototype-comparison-previews">
          <article className="prototype-preview-card">
            <h2>Live preview — Current cinematic</h2>
            <p className="meta">iframe · PR #9 behaviour</p>
            <iframe
              className="prototype-preview-iframe"
              src="/prototype/current-cinematic"
              title="Current cinematic prototype preview"
            />
          </article>
          <article className="prototype-preview-card">
            <h2>Live preview — Signature Open Limits</h2>
            <p className="meta">iframe · Original storyboard vision</p>
            <iframe
              className="prototype-preview-iframe"
              src="/prototype/signature-open-limits"
              title="Signature Open Limits prototype preview"
            />
          </article>
        </div>

        <p className="meta prototype-evidence-note">
          Video/GIF recordings: UNVERIFIED — not captured in this environment. Use live previews above or
          open routes in a new tab.
        </p>

        <MetricsBlock bundles={bundles} />

        <ComparisonTable />

        <div className="prototype-pros-cons-grid">
          <ProsCons title="Current cinematic — Pros" items={CINEMATIC_PROS} />
          <ProsCons title="Current cinematic — Cons" items={CINEMATIC_CONS} />
          <ProsCons title="Signature — Pros" items={SIGNATURE_PROS} />
          <ProsCons title="Signature — Cons" items={SIGNATURE_CONS} />
        </div>

        <div className="prototype-recommendation">
          <h2>Recommendation (engineering assessment)</h2>
          <p>{RECOMMENDATION_NOTE}</p>
        </div>

        <AuditSections bundles={bundles} />
      </section>
    </main>
  );
}

function MetricsBlock({ bundles }: { bundles: BundleMeasurements | null }) {
  return (
    <div className="prototype-metrics-grid">
      <MetricCard metrics={CINEMATIC_METRICS} bundles={bundles?.cinematic} framerKb={bundles?.framerMotionDistKb} />
      <MetricCard metrics={SIGNATURE_METRICS} bundles={bundles?.signature} framerKb={bundles?.framerMotionDistKb} />
    </div>
  );
}

function MetricCard({
  metrics,
  bundles,
  framerKb
}: {
  metrics: typeof CINEMATIC_METRICS;
  bundles?: { serverRouteKb?: number; sharedStaticChunksDirKb?: number };
  framerKb?: number;
}) {
  return (
    <article className="form-card prototype-metric-card">
      <h3>{metrics.label}</h3>
      <ul className="prototype-metric-list">
        <li>
          <strong>Duration to CTA</strong> {(metrics.durationToCtaMs / 1000).toFixed(1)}s (code)
        </li>
        <li>
          <strong>Auto-enter</strong> {metrics.autoEnterMs ? `+${metrics.autoEnterMs / 1000}s` : "Manual click only"}
        </li>
        <li>
          <strong>Phases</strong> {metrics.phaseCount}
        </li>
        <li>
          <strong>Animation layers</strong> {metrics.animationLayerCount}
        </li>
        <li>
          <strong>Complexity</strong> {metrics.implementationDifficulty}
        </li>
        <li>
          <strong>Est. mobile perf.</strong> {metrics.mobilePerformanceEstimate} (UNVERIFIED)
        </li>
        <li>
          <strong>Implementation</strong> {metrics.estimatedImplementationDays}
        </li>
        <li>
          <strong>Server route size</strong>{" "}
          {bundles?.serverRouteKb != null ? `${bundles.serverRouteKb} KB` : "UNVERIFIED — run measure script"}
        </li>
        <li>
          <strong>Shared chunks dir</strong>{" "}
          {bundles?.sharedStaticChunksDirKb != null
            ? `~${bundles.sharedStaticChunksDirKb} KB total (shared)`
            : "UNVERIFIED"}
        </li>
        {framerKb != null ? (
          <li>
            <strong>framer-motion dist</strong> ~{framerKb} KB
          </li>
        ) : null}
      </ul>
    </article>
  );
}

function ComparisonTable() {
  return (
    <>
      <h2>Comparison table</h2>
      <div className="catalog-preview-table-wrap">
        <table className="catalog-preview-table prototype-comparison-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Current cinematic</th>
              <th>Signature</th>
              <th>Assessment</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_TABLE.map((row) => (
              <tr key={row.dimension}>
                <td>{row.dimension}</td>
                <td>{row.cinematic}</td>
                <td>{row.signature}</td>
                <td>{row.winner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProsCons({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="form-card">
      <h3>{title}</h3>
      <ul className="excel-example-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function AuditSections({ bundles }: { bundles: BundleMeasurements | null }) {
  return (
    <div className="prototype-audit-sections">
      <h2>Architect audit</h2>

      <section className="prototype-audit-block">
        <h3>PASS</h3>
        <ul className="excel-example-list">
          <li>
            Prototype routes exist at /prototype/current-cinematic and /prototype/signature-open-limits
          </li>
          <li>Homepage (app/page.tsx) not modified</li>
          <li>Comparison page at /prototype-comparison with live iframe previews</li>
          {bundles ? (
            <li>Build measurement file present ({bundles.measuredAt})</li>
          ) : null}
        </ul>
      </section>

      <section className="prototype-audit-block prototype-audit-fail">
        <h3>FAIL</h3>
        <ul className="excel-example-list">
          <li>No recorded video/GIF evidence</li>
          <li>No mobile FPS profiling</li>
          <li>Signature morph still approximated — not verified as film-grade</li>
        </ul>
      </section>

      <section className="prototype-audit-block prototype-audit-unverified">
        <h3>UNVERIFIED</h3>
        <ul className="excel-example-list">
          <li>Screenshot captures of both prototypes</li>
          <li>Runtime duration on real devices (may drift from code timings)</li>
          <li>Web Audio drafting sounds on iOS Safari</li>
          <li>Exact per-route client bundle split without @next/bundle-analyzer</li>
          <li>Stakeholder emotional response / brand fit</li>
        </ul>
      </section>
    </div>
  );
}
