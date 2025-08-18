import React from "react";

export default function KitJersey({
  primary = "#1f6feb",
  accent = "#ffffff",
  shadow = "#00000020",
  className = "w-16 h-16",
}: {
  primary?: string;
  accent?: string;
  shadow?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      {/* torso */}
      <path
        d="M20 32 L32 22 L45 22 L50 28 L55 22 L68 22 L80 32 L75 85 L25 85 Z"
        fill={primary}
      />
      {/* collar */}
      <path d="M45 22 L50 28 L55 22 Z" fill={accent} />
      {/* sleeve cuffs */}
      <rect x="18" y="35" width="10" height="4" rx="2" fill={accent} />
      <rect x="72" y="35" width="10" height="4" rx="2" fill={accent} />
      {/* subtle shading */}
      <path
        d="M50 28 L60 40 L55 75 L50 85 L45 75 L40 40 Z"
        fill={shadow}
      />
    </svg>
  );
}
