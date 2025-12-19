"use client"

import React from "react"
import { Info } from "lucide-react"
import { Formation, PlayerDetail } from "@/types/team"
import { cn } from "@/lib/utils"
import { EnhancedPitch } from "./EnhancedPitch"

interface PitchCardProps {
  players: PlayerDetail[]
  formation: Formation
  captainId?: number | null
  viceCaptainId?: number | null
  selectedPlayerId?: number | null
  onPlayerClick?: (player: PlayerDetail) => void
  onPlayerHover?: (player: PlayerDetail | null) => void
  formationOptions: Formation[]
  onFormationChange?: (name: string) => void
  subtitle?: string
  className?: string
}

export function PitchCard({
  players,
  formation,
  captainId,
  viceCaptainId,
  selectedPlayerId,
  onPlayerClick,
  onPlayerHover,
  formationOptions,
  onFormationChange,
  subtitle,
  className,
}: PitchCardProps) {
  return (
    <div
      className={cn(
        "glass xg-noise rounded-2xl border border-white/10 shadow-xg-card overflow-hidden",
        className
      )}
    >
      {/* Header row */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-white text-lg font-semibold tracking-tight">Formation</h2>
            <button
              type="button"
              className="xg-focus-ring inline-flex items-center justify-center rounded-full h-8 w-8 hover:bg-white/5 text-white/60"
              aria-label="Formation help"
              title="Changing formation rearranges your XI on the pitch. It doesn’t transfer players."
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          {subtitle && (
            <p className="text-white/60 text-xs mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={formation.name}
            onChange={(e) => onFormationChange?.(e.target.value)}
            disabled={!onFormationChange}
            className={cn(
              "xg-focus-ring",
              "h-9 px-3 rounded-full text-sm",
              "bg-white/6 border border-white/10 text-white",
              "hover:bg-white/8",
              "focus:outline-none",
              !onFormationChange && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Select formation"
          >
            {formationOptions.map((f) => (
              <option key={f.name} value={f.name} className="bg-ai-dark">
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pitch */}
      <div className="p-4">
        <EnhancedPitch
          players={players}
          formation={formation}
          captainId={captainId}
          viceCaptainId={viceCaptainId}
          selectedPlayerId={selectedPlayerId}
          onPlayerClick={onPlayerClick}
          onPlayerHover={onPlayerHover}
        />
      </div>
    </div>
  )
}


