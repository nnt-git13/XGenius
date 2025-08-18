import React from "react";
import KitJersey from "./KitJersey";
import clsx from "clsx";

export type PlayerTileProps = {
  position: "GK" | "DEF" | "MID" | "FWD";
  name?: string;
  team?: string;
  price?: number;
  fixture?: { oppCode: string; homeAway: "H" | "A" };
  captain?: "C" | "VC" | null;
  flagged?: string | null;
  empty?: boolean;
  bench?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
};

const ROLE = {
  GK: { hue: "from-teal-400/10 to-teal-400/0", ring: "ring-teal-300/30" },
  DEF: { hue: "from-sky-400/10 to-sky-400/0", ring: "ring-sky-300/30" },
  MID: { hue: "from-indigo-400/10 to-indigo-400/0", ring: "ring-indigo-300/30" },
  FWD: { hue: "from-rose-400/10 to-rose-400/0", ring: "ring-rose-300/30" },
};

export default function PlayerTile({
  position,
  name,
  team,
  price,
  fixture,
  captain,
  flagged,
  empty,
  bench,
  onClick,
  onRemove,
  className,
}: PlayerTileProps) {
  const role = ROLE[position];

  return (
    <div
      className={clsx(
        "group relative rounded-2xl bg-white/[0.02] ring-1 ring-inset",
        role.ring,
        "backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
        "transition-transform hover:translate-y-[-2px]",
        bench ? "opacity-90" : "",
        className
      )}
    >
      {/* role chip */}
      <div className="absolute left-2 top-2 text-[10px] px-2 py-1 rounded-md bg-white/10 border border-white/10">
        {position}
      </div>

      {/* captain / flag chips */}
      <div className="absolute right-2 top-2 flex gap-1">
        {flagged && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30">
            {flagged === "doubt" ? "75%" : "!"}
          </span>
        )}
        {captain && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/30">
            {captain}
          </span>
        )}
      </div>

      {/* subtle role tint */}
      <div
        className={clsx(
          "absolute inset-0 rounded-2xl pointer-events-none",
          "bg-gradient-to-b",
          role.hue
        )}
      />

      {/* content */}
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          "w-full flex flex-col items-center gap-2 px-4 pt-6 pb-4",
          "text-left focus:outline-none"
        )}
      >
        <KitJersey
          className={clsx("w-[64px] h-[64px] drop-shadow-md", empty && "opacity-40")}
          primary={empty ? "#0b1b28" : undefined}
          accent={empty ? "#3b4d5f" : undefined}
        />

        <div
          className={clsx(
            "w-full rounded-lg bg-white/10 border border-white/10",
            "px-3 py-2 text-sm font-medium text-white truncate"
          )}
          title={empty ? "Empty" : name}
        >
          {empty ? "Empty" : name}
        </div>

        <div className="w-full grid grid-cols-3 items-center gap-2 text-xs">
          <div className="col-span-2">
            <div className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-white/70 truncate">
              {fixture ? `${fixture.oppCode} (${fixture.homeAway})` : team || "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center px-2 py-1 rounded-full bg-white/10 border border-white/10">
              £{typeof price === "number" ? price.toFixed(1) : "—"}m
            </div>
          </div>
        </div>
      </button>

      {/* remove button */}
      {onRemove && !empty && (
        <button
          type="button"
          onClick={onRemove}
          className={clsx(
            "absolute bottom-2 left-1/2 -translate-x-1/2",
            "h-8 w-8 rounded-full bg-white/8 border border-white/10",
            "flex items-center justify-center text-lg leading-none",
            "hover:bg-white/12"
          )}
          title="Remove"
        >
          –
        </button>
      )}
    </div>
  );
}
