"use client"

import React from "react"
import { motion } from "framer-motion"
import { Crown, AlertCircle, TrendingUp } from "lucide-react"
import { PlayerDetail } from "@/types/team"
import { cn } from "@/lib/utils"

interface PlayerCardProps {
  player: PlayerDetail
  isCaptain?: boolean
  isViceCaptain?: boolean
  isBench?: boolean
  onClick?: () => void
  className?: string
}

// Team color mappings for visual identity
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  "Arsenal": { primary: "from-red-600 to-red-800", secondary: "bg-red-500/20" },
  "Aston Villa": { primary: "from-blue-600 to-purple-800", secondary: "bg-blue-500/20" },
  "Bournemouth": { primary: "from-red-500 to-red-700", secondary: "bg-red-500/20" },
  "Brentford": { primary: "from-red-600 to-white", secondary: "bg-red-500/20" },
  "Brighton": { primary: "from-blue-500 to-blue-700", secondary: "bg-blue-500/20" },
  "Burnley": { primary: "from-blue-600 to-blue-800", secondary: "bg-blue-500/20" },
  "Chelsea": { primary: "from-blue-500 to-blue-700", secondary: "bg-blue-500/20" },
  "Crystal Palace": { primary: "from-blue-600 to-red-600", secondary: "bg-blue-500/20" },
  "Everton": { primary: "from-blue-600 to-blue-800", secondary: "bg-blue-500/20" },
  "Fulham": { primary: "from-white to-black", secondary: "bg-white/20" },
  "Liverpool": { primary: "from-red-500 to-red-700", secondary: "bg-red-500/20" },
  "Luton": { primary: "from-orange-600 to-orange-800", secondary: "bg-orange-500/20" },
  "Man City": { primary: "from-blue-400 to-blue-600", secondary: "bg-blue-400/20" },
  "Man Utd": { primary: "from-red-600 to-red-800", secondary: "bg-red-600/20" },
  "Newcastle": { primary: "from-black to-gray-800", secondary: "bg-black/20" },
  "Nott'm Forest": { primary: "from-red-600 to-red-800", secondary: "bg-red-600/20" },
  "Sheffield Utd": { primary: "from-red-600 to-red-800", secondary: "bg-red-600/20" },
  "Spurs": { primary: "from-blue-600 to-white", secondary: "bg-blue-500/20" },
  "West Ham": { primary: "from-blue-600 to-red-600", secondary: "bg-blue-500/20" },
  "Wolves": { primary: "from-orange-500 to-yellow-500", secondary: "bg-orange-500/20" },
}

const POSITION_COLORS: Record<string, string> = {
  GK: "from-gray-500 to-gray-700",
  DEF: "from-blue-500 to-blue-700",
  MID: "from-green-500 to-green-700",
  FWD: "from-red-500 to-red-700",
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  a: { label: "Available", color: "text-green-400" },
  i: { label: "Injured", color: "text-red-400" },
  s: { label: "Suspended", color: "text-yellow-400" },
  u: { label: "Unavailable", color: "text-gray-400" },
  d: { label: "Doubtful", color: "text-orange-400" },
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCaptain = false,
  isViceCaptain = false,
  isBench = false,
  onClick,
  className,
}) => {
  const teamColors = TEAM_COLORS[player.team] || { primary: "from-gray-600 to-gray-800", secondary: "bg-gray-500/20" }
  const positionColor = POSITION_COLORS[player.position] || "from-gray-500 to-gray-700"
  const status = STATUS_LABELS[player.status] || STATUS_LABELS.a

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
        "bg-gradient-to-br border-2",
        isBench ? "border-white/20" : "border-white/30",
        isCaptain ? "border-yellow-400 shadow-lg shadow-yellow-400/50" : "",
        isViceCaptain ? "border-blue-400 shadow-lg shadow-blue-400/50" : "",
        className
      )}
    >
      {/* Team color background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-20", teamColors.primary)} />
      
      {/* Position indicator */}
      <div className={cn("absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-bold text-white bg-gradient-to-r", positionColor)}>
        {player.position}
      </div>

      {/* Captain/Vice Captain badge */}
      {(isCaptain || isViceCaptain) && (
        <div className="absolute top-2 right-2">
          <Crown className={cn("h-5 w-5", isCaptain ? "text-yellow-400" : "text-blue-400")} />
        </div>
      )}

      {/* Status indicator */}
      {player.status !== "a" && (
        <div className="absolute top-10 right-2">
          <AlertCircle className={cn("h-4 w-4", status.color)} />
        </div>
      )}

      {/* Player content */}
      <div className="relative p-4 min-h-[140px] flex flex-col justify-between">
        {/* Player name */}
        <div className="mb-2">
          <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
            {player.name}
          </h3>
          <p className="text-xs text-white/70 mt-1">{player.team}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <div className="bg-black/30 rounded p-1.5">
            <p className="text-[10px] text-white/60">Price</p>
            <p className="text-xs font-bold text-white">£{player.price.toFixed(1)}M</p>
          </div>
          <div className="bg-black/30 rounded p-1.5">
            <p className="text-[10px] text-white/60">Points</p>
            <p className="text-xs font-bold text-white">{player.total_points.toFixed(0)}</p>
          </div>
        </div>

        {/* Additional stats on hover */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          whileHover={{ opacity: 1, height: "auto" }}
          className="overflow-hidden mt-2"
        >
          <div className="grid grid-cols-3 gap-1 text-[10px] text-white/70">
            <div>
              <span className="text-white/50">G:</span> {player.goals_scored}
            </div>
            <div>
              <span className="text-white/50">A:</span> {player.assists}
            </div>
            <div>
              <span className="text-white/50">CS:</span> {player.clean_sheets}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 hover:from-white/10 hover:to-white/5 transition-all duration-300 pointer-events-none rounded-xl" />
    </motion.div>
  )
}

