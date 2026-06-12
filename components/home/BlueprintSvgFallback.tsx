/** CSS-animated architectural blueprint fallback when no CMS blueprint image is uploaded. */
export default function BlueprintSvgFallback() {
  return (
    <svg
      aria-hidden
      className="blueprint-svg-fallback"
      viewBox="0 0 420 300"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="blueprint-lines">
        <rect className="bp-stroke bp-outer" height="220" rx="2" width="340" x="40" y="40" />
        <path className="bp-stroke bp-wall-v" d="M210 40 L210 160" />
        <path className="bp-stroke bp-wall-h" d="M40 160 L380 160" />
        <path className="bp-stroke bp-wall-v2" d="M120 160 L120 260" />
        <path className="bp-stroke bp-wall-v3" d="M300 160 L300 260" />
        <path className="bp-stroke bp-room" d="M120 40 L120 100 L180 100 L180 40" />
        <path className="bp-stroke bp-door" d="M300 160 A 28 28 0 0 1 328 188" />
        <circle className="bp-stroke bp-dot" cx="80" cy="80" r="4" />
        <circle className="bp-stroke bp-dot2" cx="340" cy="220" r="4" />
        <path className="bp-stroke bp-detail" d="M40 260 L380 260" />
      </g>
    </svg>
  );
}
