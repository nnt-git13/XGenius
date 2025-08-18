import React from "react";
import PlayerTile, { PlayerTileProps } from "./PlayerTile";
import clsx from "clsx";

export type Pos = "GK" | "DEF" | "MID" | "FWD";
export type PitchSlot = PlayerTileProps & { index: number };

export default function Pitch({
  rows,
  bench,
  onPick,
  onRemove,
  tileMin = 260,
  tileMax = 360,
  gap = 28,
  tileClassName = "w-full max-w-[360px]",
}: {
  rows: Record<Pos, PitchSlot[]>;
  bench?: PitchSlot[];
  onPick: (storeIndex: number) => void;
  onRemove?: (storeIndex: number) => void;
  tileMin?: number;
  tileMax?: number;
  gap?: number;
  tileClassName?: string;
}) {
  const Row: React.FC<{ pos: Pos; items: PitchSlot[] }> = ({ pos, items }) => {
    const cols = Math.max(items.length, 1);
    const style: React.CSSProperties = {
      // card width = clamp(tileMin, (container - gaps)/cols, tileMax)
      display: "grid",
      gap,
      justifyContent: "center",
      gridTemplateColumns: `
        repeat(${cols},
          minmax(
            clamp(${tileMin}px,
                  calc((100% - ${(cols - 1) * gap}px) / ${cols}),
                  ${tileMax}px),
            1fr)
        )`,
    };
    return (
      <div style={style} className="px-2">
        {items.map((s, i) => (
          <PlayerTile
            key={`${pos}-${i}-${s.index}`}
            {...s}
            className={tileClassName}
            onClick={() => onPick(s.index)}
            onRemove={onRemove ? () => onRemove(s.index) : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-white/10">
      {/* pitch surface (stripes) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg,#0b3a32 0 64px,#0a332c 64px 128px)",
        }}
      />
      {/* pitch lines & goals */}
      <PitchLines />

      {/* lanes */}
      <div className="relative z-10 p-4 md:p-6 space-y-4 md:space-y-6">
        <Row pos="GK" items={rows.GK} />
        <Row pos="DEF" items={rows.DEF} />
        <Row pos="MID" items={rows.MID} />
        <Row pos="FWD" items={rows.FWD} />

        {bench && bench.length > 0 && (
          <>
            <div className="h-2" />
            <div className="text-xs text-white/60 text-center">Bench</div>
            <div className="flex justify-center flex-wrap gap-4 md:gap-6">
              {bench.map((s, i) => (
                <PlayerTile
                  key={`bench-${i}-${s.index}`}
                  {...s}
                  bench
                  onClick={() => onPick(s.index)}
                  className={tileClassName}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- pitch drawing ---------------- */

function LineBox({
  className,
  inset,
  stroke = "rgba(255,255,255,0.45)",
  width = 2,
}: {
  className?: string;
  inset: { top?: number; bottom?: number; left?: number; right?: number };
  stroke?: string;
  width?: number;
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    top: inset.top,
    bottom: inset.bottom,
    left: inset.left,
    right: inset.right,
    border: `${width}px solid ${stroke}`,
    borderRadius: 12,
    pointerEvents: "none",
  };
  return <div className={className} style={style} />;
}

function PitchLines() {
  const stroke = "rgba(255,255,255,0.45)";
  return (
    <div className="absolute inset-0 z-[1] pointer-events-none">
      {/* halfway line */}
      <div
        className="absolute left-0 right-0"
        style={{ top: "50%", height: 2, background: stroke, transform: "translateY(-1px)" }}
      />
      {/* center circle */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: 160, height: 160, border: `2px solid ${stroke}` }}
      />
      {/* center spot */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: 6, height: 6, background: stroke }}
      />

      {/* penalty areas & 6-yard boxes */}
      <LineBox inset={{ top: 12, left: 48, right: 48 }} />
      <LineBox inset={{ top: 12, left: 160, right: 160 }} />
      <LineBox inset={{ bottom: 12, left: 48, right: 48 }} />
      <LineBox inset={{ bottom: 12, left: 160, right: 160 }} />

      {/* penalty arcs */}
      <Arc top />
      <Arc />

      {/* “goals” (little white rectangles) */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 8, width: 80, height: 6, background: stroke }} />
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 8, width: 80, height: 6, background: stroke }} />
    </div>
  );
}

function Arc({ top = false }: { top?: boolean }) {
  const stroke = "rgba(255,255,255,0.45)";
  const style: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    width: 220,
    height: 110,
    marginLeft: -110,
    border: `2px solid ${stroke}`,
    borderRadius: "110px 110px 0 0",
    borderBottom: "none",
    top: top ? 108 : undefined,
    bottom: top ? undefined : 108,
    transform: top ? "rotate(180deg)" : undefined,
    pointerEvents: "none",
  };
  return <div style={style} />;
}
