"use client"

import React, { useMemo } from "react"
import { motion } from "framer-motion"
import { PlayerDetail } from "@/types/team"
import { cn } from "@/lib/utils"
import { kitFor } from "@/lib/epl"
import { getTeamAbbreviation } from "@/utils/teamMapping"
import KitJersey from "@/components/KitJersey"
import { StatusBadges } from "./StatusBadges"

interface PlayerChipProps {
  player: PlayerDetail
  isCaptain?: boolean
  isViceCaptain?: boolean
  isSelected?: boolean
  isBench?: boolean
  transferBadge?: "in" | null
  onSelect?: () => void
  className?: string
}

export function PlayerChip({
  player,
  isCaptain = false,
  isViceCaptain = false,
  isSelected = false,
  isBench = false,
  transferBadge = null,
  onSelect,
  className,
}: PlayerChipProps) {
  const kit = kitFor(player.team)
  const teamShort = getTeamAbbreviation(player.team)
  const lastName = useMemo(() => player.name.split(" ").pop() || player.name, [player.name])
  const displayPoints = player.gw_points ?? player.total_points

  const opp = player.next_fixture_opponent_short || player.next_fixture_opponent?.slice(0, 3).toUpperCase()
  const ha = player.next_fixture_home_away
  const fixtureTag = opp ? `${opp}${ha ? ` (${ha})` : ""}` : undefined

  return (
    <motion.button
      type="button"
      data-testid={`player-chip-${player.id}`}
      aria-pressed={isSelected}
      onClick={onSelect}
      whileHover={!isBench ? { y: -2, scale: 1.02 } : {}}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "xg-focus-ring",
        "relative flex flex-col items-center",
        "rounded-2xl px-2 pt-2 pb-2",
        "bg-white/0",
        className
      )}
    >
      {/* Badge overlay */}
      <div className="relative">
        <StatusBadges player={player} isCaptain={isCaptain} isViceCaptain={isViceCaptain} />
        {transferBadge === "in" && (
          <div
            className="absolute -bottom-1 -right-1 bg-ai-primary text-black rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-lg border border-ai-primary/60 z-20"
            title="Transferred in (draft)"
          >
            IN
          </div>
        )}

        {/* Shirt with accent ring */}
        <div
          className={cn(
            "relative h-[74px] w-[74px] rounded-2xl",
            "bg-white/5 border border-white/10",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
            isSelected && "border-ai-primary/40 shadow-[0_0_0_1px_rgba(0,255,133,0.25),0_16px_40px_rgba(0,0,0,0.45)]",
            transferBadge === "in" && "border-ai-primary/60 shadow-[0_0_0_1px_rgba(0,255,133,0.35)]",
            player.status !== "a" && "saturate-50 opacity-90"
          )}
        >
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_60%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <KitJersey
              className="w-[58px] h-[58px] drop-shadow-md"
              primary={kit.primary}
              accent={kit.trim ?? "#ffffff"}
              shadow="rgba(0,0,0,0.18)"
            />
          </div>
        </div>
      </div>

      {/* Name + meta */}
      <div className="mt-2 w-[132px]">
        <div className="rounded-xl bg-black/40 border border-white/10 px-2 py-1">
          <div className="text-[12px] font-semibold text-white truncate text-center leading-tight">
            {lastName}
          </div>
          <div className="mt-0.5 flex items-center justify-center gap-2 text-[10px] text-white/60">
            <span className="font-medium">{teamShort}</span>
            <span className="text-white/30">•</span>
            <span>£{player.price.toFixed(1)}m</span>
            <span className="text-white/30">•</span>
            <span>{Number(displayPoints).toFixed(1)} pts</span>
          </div>
        </div>

        {fixtureTag && (
          <div className="mt-1 flex justify-center">
            <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-white/70">
              {fixtureTag}
            </span>
          </div>
        )}
      </div>
    </motion.button>
  )
}


