import React from "react";
import KitJersey from "./KitJersey";
import { kitFor } from "../lib/epl";

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export type PlayerTileProps = {
  name?: string;
  team?: string;
  position: "GK"|"DEF"|"MID"|"FWD";
  price?: number;
  fixture?: { oppCode: string; homeAway: "H"|"A" }; // e.g. {oppCode:"CRY", homeAway:"A"}
  captain?: boolean;
  vice?: boolean;
  flagged?: "injury"|"doubt"|"suspension"|"blank"|"dnp";
  onClick?: () => void;
  onRemove?: () => void;
  bench?: boolean;
  empty?: boolean;

};

const FlagDot: React.FC<{ type?: PlayerTileProps["flagged"] }> = ({ type }) => {
  if (!type) return null;
  const col = {
    injury: "bg-red-500",
    doubt: "bg-amber-500",
    suspension: "bg-fuchsia-600",
    blank: "bg-slate-500",
    dnp: "bg-slate-600",
  }[type];
  return <span className={cx("w-2.5 h-2.5 rounded-full", col)} />;
};

export default function PlayerTile(p: PlayerTileProps) {
  const kit = kitFor(p.team);
  const isEmpty = !!p.empty;
  return (
    <button
      onClick={p.onClick}
      aria-disabled={isEmpty}
      className={cx(
        "relative w-40 h-56 rounded-2xl border bg-gradient-to-b shadow",
        "border-white/10 from-white/5 to-white/[0.03] hover:border-white/20",
        "transition focus:outline-none focus:ring-2 focus:ring-emerald-400/50",
        isEmpty && "opacity-70",
        p.bench && "grayscale-[45%] opacity-90"
      )}
    >
      {/* position + C/VC */}
      <div className="absolute left-2 top-2 flex items-center gap-1">
        <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-white/75">{p.position}</span>
        {p.captain && (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">C</span>
        )}
        {!p.captain && p.vice && (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">V</span>
        )}
      </div>

      {/* status */}
      <div className="absolute right-2 top-2">
        <FlagDot type={p.flagged} />
      </div>

      {/* jersey */}
      <div className="absolute inset-0 grid place-items-center">
        <KitJersey primary={kit.primary} trim={kit.trim} size={78} />
      </div>

      {/* name pill */}
      <div className="absolute left-2 right-2 bottom-12">
        <div className="mx-auto max-w-[9.7rem] rounded-md bg-white/90 text-gray-900 text-[12px] font-semibold text-center py-1 px-2 shadow-sm truncate">
          {p.empty ? "Empty" : p.name}
        </div>
      </div>

      {/* fixture pill */}
      <div className="absolute left-2 right-2 bottom-6">
        <div className="mx-auto max-w-[9.7rem] rounded-md bg-white/85 text-gray-800 text-[11px] text-center py-0.5 px-2 shadow-sm truncate">
          {p.fixture ? `${p.fixture.oppCode} (${p.fixture.homeAway})` : "—"}
        </div>
      </div>

      {/* price chip */}
      <div className="absolute bottom-1 w-full grid place-items-center">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-black/40 text-white/90 border border-white/10">
          {p.price != null ? `£${p.price.toFixed(1)}m` : "—"}
        </span>
      </div>
      {!isEmpty && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <button
            type="button"
            onClick={(e) => { e.stopPropagation(); p.onRemove?.(); }}
            className="h-8 w-8 rounded-full bg-white/10 border border-white/15 hover:bg-white/20"
            title="Remove"
            >
            −
            </button>
        </div>
        )}
    </button>
  );
}
