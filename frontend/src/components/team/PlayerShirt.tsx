"use client"

import React from "react"
import { motion } from "framer-motion"
import { Crown, AlertCircle } from "lucide-react"
import { PlayerDetail } from "@/types/team"
import { cn } from "@/lib/utils"

interface PlayerShirtProps {
  player: PlayerDetail
  isCaptain?: boolean
  isViceCaptain?: boolean
  isSelected?: boolean
  isBench?: boolean
  onClick?: () => void
  className?: string
}

// Team color mappings for jersey styling with realistic shirt patterns
const TEAM_COLORS: Record<string, { 
  primary: string
  secondary: string
  accent: string
  pattern: "solid" | "stripes" | "hoops" | "sash" | "checkered"
  sponsor?: string
}> = {
  "Arsenal": { primary: "#EF0107", secondary: "#FFFFFF", accent: "#023474", pattern: "solid", sponsor: "Emirates" },
  "Aston Villa": { primary: "#95BFE5", secondary: "#670E36", accent: "#FFB612", pattern: "stripes", sponsor: "Cazoo" },
  "Bournemouth": { primary: "#DA020E", secondary: "#000000", accent: "#E62333", pattern: "stripes", sponsor: "Dafabet" },
  "Brentford": { primary: "#E30613", secondary: "#FFFFFF", accent: "#FFD700", pattern: "stripes", sponsor: "Hollywoodbets" },
  "Brighton": { primary: "#0057B8", secondary: "#FFFFFF", accent: "#FFCD00", pattern: "stripes", sponsor: "American Express" },
  "Burnley": { primary: "#6C1D45", secondary: "#99D6EA", accent: "#FFFFFF", pattern: "solid", sponsor: "W88" },
  "Chelsea": { primary: "#034694", secondary: "#FFFFFF", accent: "#ED1C24", pattern: "solid", sponsor: "Three" },
  "Crystal Palace": { primary: "#1B458F", secondary: "#C4122E", accent: "#FFFFFF", pattern: "stripes", sponsor: "Cinch" },
  "Everton": { primary: "#003399", secondary: "#FFFFFF", accent: "#FFCC00", pattern: "solid", sponsor: "Stake.com" },
  "Fulham": { primary: "#FFFFFF", secondary: "#000000", accent: "#CC0000", pattern: "solid", sponsor: "SBOTOP" },
  "Liverpool": { primary: "#C8102E", secondary: "#FFFFFF", accent: "#00B2A9", pattern: "solid", sponsor: "Standard Chartered" },
  "Luton": { primary: "#FF8C00", secondary: "#000000", accent: "#FFFFFF", pattern: "solid", sponsor: "Utilita" },
  "Man City": { primary: "#6CABDD", secondary: "#FFFFFF", accent: "#FFE066", pattern: "solid", sponsor: "Etihad Airways" },
  "Man Utd": { primary: "#DA020E", secondary: "#FFFFFF", accent: "#FBE122", pattern: "solid", sponsor: "TeamViewer" },
  "Newcastle": { primary: "#241F20", secondary: "#FFFFFF", accent: "#00B8E6", pattern: "stripes", sponsor: "Sela" },
  "Nott'm Forest": { primary: "#DD0000", secondary: "#FFFFFF", accent: "#FFFFFF", pattern: "solid", sponsor: "UNHCR" },
  "Sheffield Utd": { primary: "#EE2737", secondary: "#FFFFFF", accent: "#000000", pattern: "stripes", sponsor: "CFO Consulting" },
  "Spurs": { primary: "#132257", secondary: "#FFFFFF", accent: "#E30613", pattern: "solid", sponsor: "AIA" },
  "West Ham": { primary: "#7A263A", secondary: "#1BB1E7", accent: "#FFFFFF", pattern: "stripes", sponsor: "Betway" },
  "Wolves": { primary: "#FDB913", secondary: "#231F20", accent: "#FFFFFF", pattern: "solid", sponsor: "AstroPay" },
}

const STATUS_COLORS: Record<string, string> = {
  a: "bg-green-500",
  i: "bg-red-500",
  s: "bg-yellow-500",
  u: "bg-gray-500",
  d: "bg-orange-500",
}

// Generate shirt pattern based on team
const getShirtPattern = (colors: typeof TEAM_COLORS[string], pattern: string) => {
  switch (pattern) {
    case "stripes":
      return {
        backgroundImage: `repeating-linear-gradient(
          90deg,
          ${colors.primary} 0px,
          ${colors.primary} 8px,
          ${colors.secondary} 8px,
          ${colors.secondary} 16px
        )`,
      }
    case "hoops":
      return {
        backgroundImage: `repeating-linear-gradient(
          0deg,
          ${colors.primary} 0px,
          ${colors.primary} 12px,
          ${colors.secondary} 12px,
          ${colors.secondary} 24px
        )`,
      }
    case "sash":
      return {
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary} 40%, ${colors.secondary} 40%, ${colors.secondary} 60%, ${colors.primary} 60%)`,
      }
    case "checkered":
      return {
        backgroundImage: `
          linear-gradient(45deg, ${colors.primary} 25%, transparent 25%),
          linear-gradient(-45deg, ${colors.primary} 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, ${colors.primary} 75%),
          linear-gradient(-45deg, transparent 75%, ${colors.primary} 75%)
        `,
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
      }
    default: // solid
      return {
        background: colors.primary,
      }
  }
}

export const PlayerShirt: React.FC<PlayerShirtProps> = ({
  player,
  isCaptain = false,
  isViceCaptain = false,
  isSelected = false,
  isBench = false,
  onClick,
  className,
}) => {
  const teamColors = TEAM_COLORS[player.team] || { 
    primary: "#4B5563", 
    secondary: "#FFFFFF", 
    accent: "#9CA3AF",
    pattern: "solid" as const
  }
  const statusColor = STATUS_COLORS[player.status] || STATUS_COLORS.a
  const shirtPattern = getShirtPattern(teamColors, teamColors.pattern)

  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.08, z: 20 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn("relative cursor-pointer", className)}
      initial={{ rotateY: -15, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      style={{ perspective: "1000px" }}
    >
      {/* Shirt container with realistic 3D effect */}
      <motion.div
        className={cn(
          "relative w-20 h-28 rounded-t-lg rounded-b-2xl overflow-hidden",
          "backdrop-blur-sm border-2 shadow-2xl",
          isSelected ? "border-white shadow-white/50" : "border-white/30",
          isCaptain && "border-yellow-400 shadow-yellow-400/50",
          isViceCaptain && "border-blue-400 shadow-blue-400/50"
        )}
        style={{
          ...shirtPattern,
          boxShadow: isSelected 
            ? `0 15px 50px rgba(255,255,255,0.4), inset 0 2px 10px rgba(255,255,255,0.2), inset 0 -2px 10px rgba(0,0,0,0.2)`
            : `0 8px 30px rgba(0,0,0,0.4), inset 0 2px 8px rgba(255,255,255,0.1), inset 0 -2px 8px rgba(0,0,0,0.3)`,
          transform: "perspective(1000px) rotateX(5deg)",
          transformStyle: "preserve-3d",
        }}
        animate={{
          boxShadow: isSelected
            ? [
                `0 15px 50px rgba(255,255,255,0.4), inset 0 2px 10px rgba(255,255,255,0.2), inset 0 -2px 10px rgba(0,0,0,0.2)`,
                `0 20px 60px rgba(255,255,255,0.5), inset 0 2px 12px rgba(255,255,255,0.3), inset 0 -2px 12px rgba(0,0,0,0.2)`,
                `0 15px 50px rgba(255,255,255,0.4), inset 0 2px 10px rgba(255,255,255,0.2), inset 0 -2px 10px rgba(0,0,0,0.2)`,
              ]
            : undefined,
        }}
        transition={{
          duration: 2,
          repeat: isSelected ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        {/* Shirt texture/shine effect */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(
              135deg,
              rgba(255,255,255,0.3) 0%,
              transparent 30%,
              transparent 70%,
              rgba(0,0,0,0.2) 100%
            )`,
          }}
        />

        {/* Collar */}
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-4 rounded-t-full border-2 border-white/30"
          style={{ backgroundColor: teamColors.secondary }}
        />

        {/* Sleeves */}
        <div 
          className="absolute top-4 left-0 w-3 h-8 rounded-r-full"
          style={{ backgroundColor: teamColors.secondary }}
        />
        <div 
          className="absolute top-4 right-0 w-3 h-8 rounded-l-full"
          style={{ backgroundColor: teamColors.secondary }}
        />

        {/* Player number area (center chest) */}
        <div 
          className="absolute top-8 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/40"
          style={{ 
            backgroundColor: teamColors.secondary,
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          <span 
            className="text-lg font-bold"
            style={{ color: teamColors.primary }}
          >
            {player.id % 99 || 1}
          </span>
        </div>

        {/* Sponsor logo area (simulated) */}
        {teamColors.sponsor && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-14 h-3 bg-white/20 rounded flex items-center justify-center">
            <span className="text-[6px] font-bold text-white/80 truncate w-full text-center px-1">
              {teamColors.sponsor}
            </span>
          </div>
        )}

        {/* Captain/Vice Captain badge */}
        {(isCaptain || isViceCaptain) && (
          <motion.div
            className="absolute top-1 right-1 z-10"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Crown 
              className={cn(
                "h-4 w-4 drop-shadow-lg filter drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]",
                isCaptain ? "text-yellow-400" : "text-blue-400"
              )} 
            />
          </motion.div>
        )}

        {/* Status indicator */}
        {player.status !== "a" && (
          <div className="absolute top-1 left-1 z-10">
            <div className={cn("h-2 w-2 rounded-full", statusColor)} />
          </div>
        )}

        {/* Player name at bottom */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-1 py-1 border-t border-white/20"
          style={{ backgroundColor: `${teamColors.secondary}CC` }}
        >
          <p 
            className="text-white text-[8px] font-bold text-center truncate"
            style={{ 
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
              color: teamColors.primary === "#FFFFFF" ? "#000000" : "#FFFFFF"
            }}
          >
            {player.name.split(" ").pop() || player.name}
          </p>
        </div>

        {/* Hover shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none"
          initial={{ x: "-100%", y: "-100%" }}
          whileHover={{ x: "100%", y: "100%" }}
          transition={{ duration: 0.6 }}
        />
      </motion.div>

      {/* Stats tooltip on hover */}
      <motion.div
        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 bg-black/95 backdrop-blur-md rounded-lg px-3 py-2 border border-white/30 shadow-2xl z-50 pointer-events-none min-w-[140px]"
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        whileHover={{ opacity: 1, y: 0, scale: 1 }}
        style={{ display: "none" }}
      >
        <div className="text-white text-xs space-y-1">
          <div className="font-bold text-sm">{player.name}</div>
          <div className="text-white/70 text-[10px]">{player.team}</div>
          <div className="flex justify-between pt-1 border-t border-white/20">
            <span className="text-white/60">Price:</span>
            <span className="font-semibold">£{player.price.toFixed(1)}M</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Points:</span>
            <span className="font-semibold">{player.total_points.toFixed(0)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
