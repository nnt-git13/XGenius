"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, Crown, Target, TrendingUp, Sparkles } from "lucide-react"
import { PlayerDetail } from "@/types/team"
import { cn } from "@/lib/utils"
import { getTeamAbbreviation } from "@/utils/teamMapping"

interface PlayerDetailsPanelProps {
  player: PlayerDetail | null
  isCaptain?: boolean
  isViceCaptain?: boolean
  onSetCaptain?: () => void
  onSetViceCaptain?: () => void
  onTransfer?: () => void
  actionsDisabled?: boolean
  actionsDisabledLabel?: string
  className?: string
}

export function PlayerDetailsPanel({
  player,
  isCaptain,
  isViceCaptain,
  onSetCaptain,
  onSetViceCaptain,
  onTransfer,
  actionsDisabled = false,
  actionsDisabledLabel = "Unavailable for previous gameweeks",
  className,
}: PlayerDetailsPanelProps) {
  return (
    <div className={cn("glass xg-noise rounded-2xl border border-white/10 shadow-xg-card overflow-hidden", className)}>
      <AnimatePresence mode="wait">
        {!player ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="p-6 min-h-[420px] flex items-center justify-center"
          >
            <div className="text-center max-w-sm">
              <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-white/60" />
              </div>
              <h3 className="text-white font-semibold text-base">Player details</h3>
              <p className="text-white/60 text-sm mt-1">
                Click a player on the pitch to view pro-level stats and actions.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs text-white/50">
                <Sparkles className="h-4 w-4 text-ai-secondary" />
                Tip: use the formation pill to preview layouts.
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white text-xl font-semibold tracking-tight truncate">
                    {player.name}
                  </h3>
                  {isCaptain && <Crown className="h-5 w-5 text-yellow-400" aria-label="Captain" />}
                  {isViceCaptain && !isCaptain && <Crown className="h-5 w-5 text-blue-400" aria-label="Vice captain" />}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-white/70">
                  <span className="px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-xs font-semibold text-white/80">
                    {player.position}
                  </span>
                  <span className="text-white/60">•</span>
                  <span className="truncate">{getTeamAbbreviation(player.team)}</span>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              {[
                { label: "Price", value: `£${player.price.toFixed(1)}m`, icon: Target },
                { label: "GW points", value: `${(player.gw_points ?? 0).toFixed(0)}`, icon: TrendingUp },
                { label: "Season points", value: `${player.total_points.toFixed(0)}`, icon: TrendingUp },
                { label: "Goals", value: `${player.goals_scored}`, icon: Activity },
                { label: "Assists", value: `${player.assists}`, icon: Activity },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-white/5 border border-white/10 p-4"
                >
                  <div className="flex items-center gap-2 text-white/60 text-xs">
                    <s.icon className="h-4 w-4" />
                    <span>{s.label}</span>
                  </div>
                  <div className="mt-2 text-white text-lg font-semibold">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="mt-5 rounded-xl bg-black/20 border border-white/10 p-4">
              <div className="text-white/70 text-xs font-semibold mb-2">Insights</div>
              <ul className="space-y-1 text-sm text-white/70 list-disc pl-4">
                <li>Form and fixture context will appear here when available.</li>
                <li>Use Copilot for captain pick and transfer guidance.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="mt-5 grid grid-cols-1 gap-2">
              {/* Disabled actions block (captain/transfer) */}
              <div className="relative grid grid-cols-1 gap-2">
                {!isCaptain && onSetCaptain && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!actionsDisabled) onSetCaptain()
                    }}
                    disabled={actionsDisabled}
                    className={cn(
                      "xg-focus-ring h-10 rounded-xl border font-semibold text-sm transition-colors",
                      actionsDisabled
                        ? "bg-white/5 border-white/10 text-white/35 cursor-not-allowed"
                        : "bg-ai-primary/15 border-ai-primary/25 text-ai-primary hover:bg-ai-primary/20"
                    )}
                  >
                    Set as captain
                  </button>
                )}
                {!isViceCaptain && !isCaptain && onSetViceCaptain && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!actionsDisabled) onSetViceCaptain()
                    }}
                    disabled={actionsDisabled}
                    className={cn(
                      "xg-focus-ring h-10 rounded-xl border font-semibold text-sm transition-colors",
                      actionsDisabled
                        ? "bg-white/5 border-white/10 text-white/35 cursor-not-allowed"
                        : "bg-blue-400/15 border-blue-400/25 text-blue-200 hover:bg-blue-400/20"
                    )}
                  >
                    Set as vice captain
                  </button>
                )}
                {onTransfer && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!actionsDisabled) onTransfer()
                    }}
                    disabled={actionsDisabled}
                    className={cn(
                      "xg-focus-ring h-10 rounded-xl border font-semibold text-sm transition-colors",
                      actionsDisabled
                        ? "bg-white/5 border-white/10 text-white/35 cursor-not-allowed"
                        : "bg-white/5 border-white/10 text-white/90 hover:bg-white/8"
                    )}
                  >
                    Transfer out
                  </button>
                )}

                {actionsDisabled && (onTransfer || onSetCaptain) && (
                  <div className="pointer-events-none absolute inset-0 rounded-xl bg-black/35 border border-white/10 flex items-center justify-center">
                    <div className="px-3 py-2 rounded-lg bg-black/55 border border-white/10 text-white/75 text-xs font-semibold">
                      {actionsDisabledLabel}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  // Player profile route expects FPL element id (bootstrap-static `elements[].id`)
                  const playerId = (player.fpl_id ?? player.id)?.toString()
                  if (playerId) {
                    window.location.href = `/player/${playerId}?from=team`
                  } else {
                    console.error('No valid player ID found', player)
                  }
                }}
                className="xg-focus-ring h-10 rounded-xl bg-white/5 border border-white/10 text-white/90 font-semibold text-sm hover:bg-white/8"
              >
                View full stats
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


