import React from "react";

export default function KitJersey({
  primary, trim = "#fff", size = 76
}: { primary: string; trim?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {/* body */}
      <path fill={primary} d="M16 10l8-6h16l8 6 6 6-8 8v22c0 2-2 4-4 4H22c-2 0-4-2-4-4V24l-8-8 6-6z"/>
      {/* collar */}
      <path fill={trim} d="M26 10h12l-2 4H28z"/>
      {/* sleeve trims */}
      <rect x="7"  y="16" width="7" height="3" rx="1" fill={trim} />
      <rect x="50" y="16" width="7" height="3" rx="1" fill={trim} />
      {/* soft highlight */}
      <path fill="white" opacity="0.08" d="M20 14l8-6h8L22 44V22z"/>
    </svg>
  );
}
