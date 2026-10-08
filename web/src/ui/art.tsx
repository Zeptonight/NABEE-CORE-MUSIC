import { useId } from 'react';

/**
 * NABEE HEX TEAM visual identity — hooded mascot with crown + crystalline shards.
 * 100% code-drawn (SVG). No raster images, no AI-generated assets.
 */

export function CrownIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 7.2l4.6 4.2L12 4l4.4 7.4L21 7.2l-1.7 11.3H4.7L3 7.2Z"
        fill="url(#cg)"
        stroke="#dbe9ff"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="3.4" r="1.5" fill="#7ee0ff" />
      <circle cx="3.2" cy="7" r="1.2" fill="#7ee0ff" />
      <circle cx="20.8" cy="7" r="1.2" fill="#7ee0ff" />
      <defs>
        <linearGradient id="cg" x1="12" y1="4" x2="12" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4f8ff" />
          <stop offset="1" stopColor="#9fc2ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Crystals({ uid }: { uid: string }) {
  return (
    <g>
      <polygon points="24,96 46,18 74,88" fill={`url(#cbA-${uid})`} opacity="0.9" />
      <polygon points="150,110 178,30 196,104" fill={`url(#cbA-${uid})`} opacity="0.75" />
      <polygon points="10,120 30,84 52,128" fill={`url(#cbB-${uid})`} opacity="0.6" />
      <polygon points="158,128 186,92 200,132" fill={`url(#cbB-${uid})`} opacity="0.5" />
      <polygon points="60,40 78,6 96,44" fill={`url(#cbB-${uid})`} opacity="0.45" />
      <polygon points="120,30 138,2 156,36" fill={`url(#cbC-${uid})`} opacity="0.8" />
      <polygon points="36,150 58,112 82,152" fill={`url(#cbC-${uid})`} opacity="0.35" />
      <polygon points="128,146 150,110 174,150" fill={`url(#cbC-${uid})`} opacity="0.4" />
    </g>
  );
}

/** Hooded mascot head with crown — the NABEE identity mark. */
export function Mascot({ size = 90, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`hood-${uid}`} x1="40" y1="30" x2="160" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#24418c" />
          <stop offset="0.5" stopColor="#14265c" />
          <stop offset="1" stopColor="#0a1533" />
        </linearGradient>
        <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#57b6ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#2f7dff" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`crown-${uid}`} x1="100" y1="18" x2="100" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f2f7ff" />
          <stop offset="1" stopColor="#8fb4f4" />
        </linearGradient>
        <radialGradient id={`eye-${uid}`} cx="0.5" cy="0.5" r="0.55">
          <stop stopColor="#d8f8ff" />
          <stop offset="0.55" stopColor="#5fe0ff" />
          <stop offset="1" stopColor="#2f9dff" stopOpacity="0.25" />
        </radialGradient>
        <linearGradient id={`cbA-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2f7dff" />
          <stop offset="1" stopColor="#122a68" />
        </linearGradient>
        <linearGradient id={`cbB-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#4cc9f0" />
          <stop offset="1" stopColor="#183a80" />
        </linearGradient>
        <linearGradient id={`cbC-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0a1738" />
        </linearGradient>
        <radialGradient id={`aura-${uid}`} cx="0.5" cy="0.55" r="0.6">
          <stop stopColor="#1e4fd6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#050d26" stopOpacity="0" />
        </radialGradient>
        <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="100" cy="104" rx="98" ry="96" fill={`url(#aura-${uid})`} />
      <Crystals uid={uid} />

      {/* cloak / shoulders */}
      <path d="M30 200c4-46 30-64 70-64s66 18 70 64Z" fill={`url(#hood-${uid})`} />
      {/* collar crystals */}
      <polygon points="58,150 70,128 82,152" fill={`url(#cbA-${uid})`} opacity="0.9" />
      <polygon points="118,152 130,128 142,150" fill={`url(#cbA-${uid})`} opacity="0.85" />

      {/* hood */}
      <path
        d="M100 22c38 0 64 30 64 74 0 26-8 46-18 58-10 12-28 18-46 18s-36-6-46-18c-10-12-18-32-18-58 0-44 26-74 64-74Z"
        fill={`url(#hood-${uid})`}
      />
      {/* hood rim light (left) */}
      <path d="M100 22c-38 0-64 30-64 74 0 26 8 46 18 58-22-14-30-38-30-64C24 48 56 20 100 22Z" fill={`url(#rim-${uid})`} opacity="0.5" />
      {/* hood tip highlight */}
      <path d="M100 22c14 0 26 4 36 10-12-2-24-3-36-3s-24 1-36 3c10-6 22-10 36-10Z" fill="#6ea8ff" opacity="0.5" />

      {/* face void */}
      <path d="M100 66c22 0 38 14 40 36 2 20-10 40-40 40s-42-20-40-40c2-22 18-36 40-36Z" fill="#020614" />
      {/* glowing eyes */}
      <g filter={`url(#glow-${uid})`}>
        <polygon points="72,104 92,98 92,110 72,114" fill={`url(#eye-${uid})`} />
        <polygon points="128,104 108,98 108,110 128,114" fill={`url(#eye-${uid})`} />
      </g>

      {/* crown */}
      <g transform="translate(100 44) rotate(-4)">
        <path
          d="M-30 6 -16 -4 0 -14 16 -4 30 6 24 26 -24 26Z"
          fill={`url(#crown-${uid})`}
          stroke="#dbe9ff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="-16" r="3.2" fill="#7ee0ff" />
        <circle cx="-32" cy="5" r="2.6" fill="#7ee0ff" />
        <circle cx="32" cy="5" r="2.6" fill="#7ee0ff" />
        <rect x="-24" y="22" width="48" height="6" rx="2" fill="#5f8fe8" opacity="0.65" />
        <circle cx="0" cy="17" r="2.6" fill="#2f7dff" />
      </g>
    </svg>
  );
}

/** Full logo lockup (mascot + NABEE HEX TEAM lettering) used in the sidebar. */
export function LogoLockup({ mascot = 76 }: { mascot?: number }) {
  return (
    <div className="logo-lockup">
      <CrownIcon size={15} className="logo-crown-l" />
      <Mascot size={mascot} />
      <div className="logo-text">
        <span>
          NABEE <em>HEX</em>
        </span>
        <span className="logo-line2">
          TEAM <CrownIcon size={13} className="logo-crown-r" />
        </span>
      </div>
    </div>
  );
}

/** Ambient crystalline page backdrop (behind the dashboard frame). */
export function CrystalBackdrop() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg className="crystal-backdrop" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`bgR-${uid}`} cx="0.75" cy="0.2" r="1">
          <stop stopColor="#0a1c4e" />
          <stop offset="0.55" stopColor="#050d26" />
          <stop offset="1" stopColor="#020714" />
        </radialGradient>
        <linearGradient id={`shA-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2f7dff" />
          <stop offset="1" stopColor="#0a1a44" />
        </linearGradient>
        <linearGradient id={`shB-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#4cc9f0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#122a68" />
        </linearGradient>
        <linearGradient id={`shC-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#7b5cff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1a1c66" />
        </linearGradient>
        <filter id={`blur1-${uid}`}>
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id={`blur6-${uid}`}>
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect width="1440" height="900" fill={`url(#bgR-${uid})`} />
      {/* large glow blobs */}
      <ellipse cx="1150" cy="160" rx="330" ry="240" fill="#1e4fd6" opacity="0.18" filter={`url(#blur6-${uid})`} />
      <ellipse cx="220" cy="760" rx="300" ry="200" fill="#1e4fd6" opacity="0.12" filter={`url(#blur6-${uid})`} />
      <ellipse cx="700" cy="80" rx="260" ry="140" fill="#4cc9f0" opacity="0.07" filter={`url(#blur6-${uid})`} />
      {/* crystal clusters — top right */}
      <g filter={`url(#blur1-${uid})`}>
        <polygon points="1210,220 1290,-40 1380,180" fill={`url(#shA-${uid})`} opacity="0.85" />
        <polygon points="1330,260 1420,60 1440,280" fill={`url(#shB-${uid})`} opacity="0.75" />
        <polygon points="1120,180 1190,20 1250,200" fill={`url(#shC-${uid})`} opacity="0.6" />
        <polygon points="1250,320 1310,180 1360,330" fill={`url(#shA-${uid})`} opacity="0.5" />
      </g>
      {/* bottom-left cluster */}
      <g filter={`url(#blur1-${uid})`}>
        <polygon points="30,900 90,660 190,900" fill={`url(#shA-${uid})`} opacity="0.7" />
        <polygon points="150,900 230,720 320,900" fill={`url(#shB-${uid})`} opacity="0.55" />
        <polygon points="-40,760 20,600 90,780" fill={`url(#shC-${uid})`} opacity="0.5" />
      </g>
      {/* top-left small shards */}
      <g opacity="0.5" filter={`url(#blur1-${uid})`}>
        <polygon points="40,60 90,-60 150,80" fill={`url(#shA-${uid})`} />
        <polygon points="150,110 200,10 240,120" fill={`url(#shB-${uid})`} opacity="0.7" />
      </g>
      {/* chain hints (right side) */}
      <g stroke="#3f6fd6" strokeWidth="3" opacity="0.35" fill="none">
        <path d="M1418 340c-14 26 14 44 0 70s14 44 0 70 14 44 0 70" />
        <path d="M1444 300c-14 26 14 44 0 70s14 44 0 70" />
      </g>
      {/* vignette */}
      <rect width="1440" height="900" fill="#020714" opacity="0.28" />
    </svg>
  );
}

/** Square cover art (now-playing / queue thumbnails). */
export function CoverArt({ size = 30, rounded = 8 }: { size?: number; rounded?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ borderRadius: rounded, display: 'block' }} aria-hidden="true">
      <defs>
        <radialGradient id={`cv-${uid}`} cx="0.35" cy="0.3" r="1">
          <stop stopColor="#12275c" />
          <stop offset="1" stopColor="#060d24" />
        </radialGradient>
        <linearGradient id={`cvs-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2f7dff" />
          <stop offset="1" stopColor="#0a1a44" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#cv-${uid})`} />
      <polygon points="62,30 78,4 92,34" fill={`url(#cvs-${uid})`} opacity="0.8" />
      <polygon points="14,72 26,50 40,74" fill={`url(#cvs-${uid})`} opacity="0.6" />
      <g transform="translate(50 58) scale(0.42) translate(-100 -100)">
        <MascotInner uid={uid} />
      </g>
    </svg>
  );
}

/** Mascot without outer svg wrapper (for composition inside other SVGs). */
export function MascotInner({ uid }: { uid: string }) {
  return (
    <g>
      <path d="M100 22c38 0 64 30 64 74 0 26-8 46-18 58-10 12-28 18-46 18s-36-6-46-18c-10-12-18-32-18-58 0-44 26-74 64-74Z" fill="#14265c" />
      <path d="M100 22c-38 0-64 30-64 74 0 26 8 46 18 58-22-14-30-38-30-64C24 48 56 20 100 22Z" fill="#2f7dff" opacity="0.45" />
      <path d="M100 66c22 0 38 14 40 36 2 20-10 40-40 40s-42-20-40-40c2-22 18-36 40-36Z" fill="#020614" />
      <polygon points="72,104 92,98 92,110 72,114" fill="#5fe0ff" />
      <polygon points="128,104 108,98 108,110 128,114" fill="#5fe0ff" />
      <g transform="translate(100 44) rotate(-4)">
        <path d="M-30 6 -16 -4 0 -14 16 -4 30 6 24 26 -24 26Z" fill="#e8f0ff" stroke="#dbe9ff" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
    </g>
  );
}
