/** Decorative, resolution-independent artwork for the six discovery tools. */
export function ModuleIllustration({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 360 190" fill="none" aria-hidden="true" className="ax-module-illustration">
      <g stroke="currentColor" strokeWidth="0.7" opacity="0.16">
        <circle cx="180" cy="95" r="76" />
        <circle cx="180" cy="95" r="64" />
        <path d="M36 95h48m192 0h48M180 12v9m0 148v9" />
        <path d="m45 89 6 6-6 6-6-6Zm270 0 6 6-6 6-6-6Z" />
      </g>
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        {kind === "tuvi" && <g className="ax-art-motion ax-art-tuvi">
          <rect x="127" y="42" width="106" height="106" rx="3" />
          <rect x="154" y="69" width="52" height="52" />
          <path d="M154 42v27m26-27v27m26-27v27M154 121v27m26-27v27m26-27v27M127 69h27m-27 26h27m-27 26h27m52-52h27m-27 26h27m-27 26h27" opacity=".55" />
          <path d="m180 79 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" fill="currentColor" fillOpacity=".12" />
          <circle cx="140" cy="55" r="2" fill="currentColor" /><circle cx="220" cy="109" r="2" fill="currentColor" />
          <path d="m220 49 2 4 4 2-4 2-2 4-2-4-4-2 4-2ZM138 134h5m-3-3v6" />
        </g>}
        {kind === "zodiac" && <g className="ax-art-motion ax-art-zodiac">
          <circle cx="180" cy="95" r="53" />
          <g className="ax-art-motion ax-art-orbit"><ellipse cx="180" cy="95" rx="73" ry="22" transform="rotate(-28 180 95)" opacity=".5" /></g>
          <path d="M190 57a39 39 0 1 0 26 61 34 34 0 0 1-26-61Z" fill="currentColor" fillOpacity=".08" />
          <path d="m219 56 3 9 9 3-9 3-3 9-3-9-9-3 9-3ZM142 115l13-16 21 12 20-16" opacity=".8" />
          {[ [142,115], [155,99], [176,111], [196,95] ].map(([x,y]) => <circle key={x} cx={x} cy={y} r="2.5" fill="currentColor" />)}
        </g>}
        {kind === "iching" && <g className="ax-art-motion ax-art-iching">
          <path d="m180 34 43 18 18 43-18 43-43 18-43-18-18-43 18-43Z" />
          <circle cx="180" cy="95" r="30" />
          <path d="M180 65a15 15 0 0 1 0 30 15 15 0 0 0 0 30 30 30 0 0 0 0-60Z" fill="currentColor" fillOpacity=".85" stroke="none" />
          <circle cx="180" cy="80" r="3" fill="var(--art-bg)" stroke="none" />
          <circle cx="180" cy="110" r="3" fill="currentColor" stroke="none" />
          <path d="M169 44h22m-22 5h22m-22 92h9m4 0h9m-22 5h22M131 84v22m5-22v9m0 4v9m88-22v22m5-22v9m0 4v9" strokeWidth="2" />
        </g>}
        {kind === "battu" && <g className="ax-art-motion ax-art-battu">
          {[0,1,2,3].map(i => <g className={`ax-art-motion ax-art-pillar ax-art-pillar-${i}`} key={i} transform={`translate(${127+i*29} 0)`}>
            <path d="M0 137h20M3 131V63h14v68M0 57h20M10 45v8" />
            <path d="M7 76h6m-6 8h6m-6 8h6m-6 19h6m-6 8h6" opacity=".5" />
            <circle cx="10" cy="101" r="2" fill="currentColor" />
          </g>)}
          <path d="M117 144h126M122 150h116M128 41l52-16 52 16" opacity=".5" />
        </g>}
        {kind === "numerology" && <g className="ax-art-motion ax-art-numerology">
          <path d="m180 37 55 96H125Z" opacity=".45" />
          <circle cx="180" cy="95" r="47" />
          <path d="M165 72h32l-24 47" strokeWidth="3" />
          <path d="M164 100h29" />
          {[ [180,37], [235,133], [125,133] ].map(([x,y]) => <g key={x}><circle cx={x} cy={y} r="7" fill="var(--art-bg)" /><circle cx={x} cy={y} r="2" fill="currentColor" /></g>)}
          <path d="M145 58h5m-2.5-2.5v5m59 66h5m-2.5-2.5v5" opacity=".65" />
        </g>}
        {kind === "tarot" && <g className="ax-art-motion ax-art-tarot">
          <rect x="139" y="49" width="57" height="91" rx="5" transform="rotate(-18 139 49)" opacity=".5" />
          <rect x="172" y="34" width="62" height="100" rx="5" transform="rotate(14 172 34)" fill="var(--art-bg)" />
          <g transform="rotate(14 172 34)">
            <rect x="178" y="40" width="50" height="88" rx="2" opacity=".4" />
            <path d="m203 62 4 16 13 6-13 5-4 17-4-17-13-5 13-6Z" fill="currentColor" fillOpacity=".12" />
            <path d="M198 116h10m-20-65h3m23 0h3" opacity=".65" />
          </g>
          <path d="m133 141 2 6 6 2-6 2-2 6-2-6-6-2 6-2ZM243 57h8m-4-4v8" />
        </g>}
      </g>
    </svg>
  );
}
