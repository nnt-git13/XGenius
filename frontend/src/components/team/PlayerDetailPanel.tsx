"use client"

import React from "react"
import { motion } from "framer-motion"
import { Crown, TrendingUp, Target, AlertCircle, X } from "lucide-react"
import { PlayerDetail } from "@/types/team"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface PlayerDetailPanelProps {
  player: PlayerDetail | null
  isCaptain?: boolean
  isViceCaptain?: boolean
  onClose?: () => void
  onSetCaptain?: () => void
  onTransfer?: () => void
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  a: { label: "Available", color: "text-green-400", bg: "bg-green-500/20" },
  i: { label: "Injured", color: "text-red-400", bg: "bg-red-500/20" },
  s: { label: "Suspended", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  u: { label: "Unavailable", color: "text-gray-400", bg: "bg-gray-500/20" },
  d: { label: "Doubtful", color: "text-orange-400", bg: "bg-orange-500/20" },
}

export const PlayerDetailPanel: React.FC<PlayerDetailPanelProps> = ({
  player,
  isCaptain,
  isViceCaptain,
  onClose,
  onSetCaptain,
  onTransfer,
}) => {
  if (!player) {
    return (
      <Card variant="glass" className="h-full">
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <Target className="h-12 w-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/70">Select a player to view details</p>
          </div>
        </div>
      </Card>
    )
  }

  const status = STATUS_LABELS[player.status] || STATUS_LABELS.a

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <Card variant="glow" className="h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-white">{player.name}</h3>
              {isCaptain && <Crown className="h-5 w-5 text-yellow-400" />}
              {isViceCaptain && <Crown className="h-5 w-5 text-blue-400" />}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 rounded bg-fpl-green/20 text-fpl-green font-semibold">
                {player.position}
              </span>
              <span className="text-white/70">{player.team}</span>
              <span className={cn("px-2 py-1 rounded text-xs font-medium", status.bg, status.color)}>
                {status.label}
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white/70" />
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/60 text-sm mb-1">Price</p>
            <p className="text-2xl font-bold text-white">£{player.price.toFixed(1)}M</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/60 text-sm mb-1">Total Points</p>
            <p className="text-2xl font-bold text-white">{player.total_points.toFixed(0)}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/60 text-sm mb-1">Goals</p>
            <p className="text-2xl font-bold text-white">{player.goals_scored}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/60 text-sm mb-1">Assists</p>
            <p className="text-2xl font-bold text-white">{player.assists}</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-white/70 text-sm">Clean Sheets</span>
            <span className="text-white font-semibold">{player.clean_sheets}</span>
          </div>
          {player.fpl_code && (
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/70 text-sm">FPL Code</span>
              <span className="text-white font-semibold">{player.fpl_code}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-4 border-t border-white/10">
          {!isCaptain && onSetCaptain && (
            <Button
              variant="primary"
              className="w-full"
              onClick={onSetCaptain}
            >
              <Crown className="mr-2 h-4 w-4" />
              Set as Captain
            </Button>
          )}
          {onTransfer && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onTransfer}
            >
              Transfer Out
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = `/player/${player.id}`}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            View Full Stats
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

