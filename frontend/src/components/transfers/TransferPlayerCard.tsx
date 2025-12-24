"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ExternalLink, ArrowRightLeft, TrendingUp, Target, Zap, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TransferPlayer {
  id: number
  fpl_id?: number
  name: string
  position: "GK" | "DEF" | "MID" | "FWD"
  team: string
  team_short_name?: string
  price: number
  total_points: number
  goals_scored: number
  assists: number
  clean_sheets?: number
  form?: number
  ep_next?: number
  ppg?: number
  status?: string
  selected_by_percent?: number
}

interface TransferPlayerCardProps {
  player: TransferPlayer
  budget: number // Available budget in £m
  onTransferIn: (player: TransferPlayer) => void
  index?: number
}

export const TransferPlayerCard: React.FC<TransferPlayerCardProps> = ({
  player,
  budget,
  onTransferIn,
  index = 0,
}) => {
  const router = useRouter()
  
  // Check if player is over budget
  const isOverBudget = player.price > budget
  
  // Position color coding
  const positionColors = {
    GK: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    DEF: "bg-green-500/20 text-green-400 border-green-500/30",
    MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    FWD: "bg-red-500/20 text-red-400 border-red-500/30",
  }
  
  // Form rating color
  const getFormColor = (form: number) => {
    if (form >= 7) return "text-green-400"
    if (form >= 5) return "text-lime-400"
    if (form >= 3) return "text-yellow-400"
    return "text-red-400"
  }

  const handleViewStats = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Pass returnTo so back navigation returns to transfers page
    const returnTo = encodeURIComponent("/transfers")
    router.push(`/player/${player.fpl_id || player.id}?from=transfers&returnTo=${returnTo}`)
  }

  const handleTransferIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOverBudget) {
      onTransferIn(player)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className={cn(
        "relative group rounded-2xl border overflow-hidden transition-all h-[280px] flex flex-col",
        isOverBudget
          ? "bg-white/5 border-white/10 opacity-60"
          : "bg-white/5 border-white/10 hover:border-ai-primary/40 hover:bg-white/8"
      )}
    >
      {/* Over budget overlay */}
      {isOverBudget && (
        <div className="absolute inset-0 z-10 bg-black/40 flex items-center justify-center">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">Over Budget</span>
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-white truncate group-hover:text-ai-primary transition-colors">
              {player.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold border",
                positionColors[player.position]
              )}>
                {player.position}
              </span>
              <span className="text-white/60 text-sm">
                {player.team_short_name || player.team}
              </span>
            </div>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-bold",
            isOverBudget
              ? "bg-red-500/20 text-red-400"
              : "bg-ai-primary/20 text-ai-primary"
          )}>
            £{player.price.toFixed(1)}m
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg bg-black/30 p-2 text-center">
            <div className="text-white/50 text-[10px] uppercase tracking-wide">Points</div>
            <div className="text-white font-bold text-lg">{player.total_points}</div>
          </div>
          <div className="rounded-lg bg-black/30 p-2 text-center">
            <div className="text-white/50 text-[10px] uppercase tracking-wide">Goals</div>
            <div className="text-white font-bold text-lg">{player.goals_scored}</div>
          </div>
          <div className="rounded-lg bg-black/30 p-2 text-center">
            <div className="text-white/50 text-[10px] uppercase tracking-wide">Assists</div>
            <div className="text-white font-bold text-lg">{player.assists}</div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="flex items-center gap-3 mb-4">
          {player.form !== undefined && (
            <div className="flex items-center gap-1">
              <TrendingUp className={cn("h-3.5 w-3.5", getFormColor(player.form))} />
              <span className={cn("text-xs font-medium", getFormColor(player.form))}>
                {player.form.toFixed(1)}
              </span>
            </div>
          )}
          {player.ep_next !== undefined && (
            <div className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-400">
                EP: {player.ep_next.toFixed(1)}
              </span>
            </div>
          )}
          {player.ppg !== undefined && (
            <div className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-400">
                PPG: {player.ppg.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Status */}
        {player.status && player.status !== "a" && (
          <div className="mb-3">
            <span className={cn(
              "text-xs px-2 py-1 rounded-lg border",
              player.status === "i" ? "bg-red-500/10 border-red-500/20 text-red-400" :
              player.status === "d" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
              "bg-orange-500/10 border-orange-500/20 text-orange-400"
            )}>
              {player.status === "i" ? "Injured" : player.status === "d" ? "Doubtful" : "Suspended"}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={handleViewStats}
            className="flex-1 py-2 rounded-lg bg-white/10 border border-white/20 
                       hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4 text-white/70" />
            <span className="text-sm font-medium text-white/80">View Stats</span>
          </button>
          <button
            onClick={handleTransferIn}
            disabled={isOverBudget}
            className={cn(
              "flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors",
              isOverBudget
                ? "bg-white/5 border border-white/10 cursor-not-allowed"
                : "bg-ai-primary/20 border border-ai-primary/30 hover:bg-ai-primary/30"
            )}
          >
            <ArrowRightLeft className={cn("h-4 w-4", isOverBudget ? "text-white/30" : "text-ai-primary")} />
            <span className={cn("text-sm font-medium", isOverBudget ? "text-white/30" : "text-ai-primary")}>
              Transfer In
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

