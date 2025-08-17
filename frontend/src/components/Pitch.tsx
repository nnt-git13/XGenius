import React from "react";
import PlayerTile, { PlayerTileProps } from "./PlayerTile";

const TILE_MIN_W = 200;   // px
const TILE_MAX_W = 260;   // px
const GAP = 16;           // px

type Slot = PlayerTileProps & { id: string };
export type Pos = "GK" | "DEF" | "MID" | "FWD";
export type PitchSlot = PlayerTileProps & { index: number };

export default function Pitch({
  rows,
  bench,
  onPick,
  onRemove,
}: {
  rows: Record<Pos, PitchSlot[]>;
  bench?: PitchSlot[];
  onPick: (storeIndex: number) => void;
  onRemove?: (storeIndex: number) => void;
}) {
  const Row: React.FC<{ pos: Pos; items: PitchSlot[] }> = ({ pos, items }) => {
    const count = Math.max(items.length, 1);
    return (
      <div
        className="grid justify-center"
        style={{
          gridTemplateColumns: `repeat(${count}, minmax(${TILE_MIN_W}px, ${TILE_MAX_W}px))`,
          gap: GAP,
        }}
      >
        {items.map((s, i) => (
          <PlayerTile
            key={`${pos}-${i}-${s.index}`}
            {...s}
            onClick={() => onPick(s.index)}
            onRemove={onRemove ? () => onRemove(s.index) : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto rounded-3xl bg-gradient-to-b from-emerald-900/40 to-emerald-900/20 p-4 md:p-6 border border-white/10">
      <Row pos="GK" items={rows.GK} />
      <div style={{ height: GAP }} />
      <Row pos="DEF" items={rows.DEF} />
      <div style={{ height: GAP }} />
      <Row pos="MID" items={rows.MID} />
      <div style={{ height: GAP }} />
      <Row pos="FWD" items={rows.FWD} />

      {bench && bench.length > 0 && (
        <>
          <div style={{ height: GAP + 4 }} />
          <div className="text-xs text-white/60 text-center mb-2">Bench</div>
          <div
            className="grid justify-center"
            style={{
              gridTemplateColumns: `repeat(${bench.length}, minmax(${TILE_MIN_W}px, ${TILE_MAX_W}px))`,
              gap: GAP,
            }}
          >
            {bench.map((s, i) => (
              <PlayerTile
                key={`BENCH-${i}-${s.index}`}
                {...s}
                bench
                onClick={() => onPick(s.index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
