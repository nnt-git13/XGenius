"use client"

import React from "react"
import { motion } from "framer-motion"
import { PlayerCard } from "./PlayerCard"
import { PlayerDetail, Formation } from "@/types/team"
import { cn } from "@/lib/utils"

interface PitchViewProps {
  players: PlayerDetail[]
  formation: Formation
  captainId?: number | null
  viceCaptainId?: number | null
  onPlayerClick?: (player: PlayerDetail) => void
  className?: string
}

const POSITION_LAYOUTS: Record<string, { y: number; positions: number[] }> = {
  GK: { y: 5, positions: [50] }, // Center
  DEF: { y: 25, positions: [20, 35, 65, 80] }, // Spread across
  MID: { y: 50, positions: [15, 30, 50, 70, 85] }, // Spread across
  FWD: { y: 75, positions: [30, 70] }, // Spread across
}

export const PitchView: React.FC<PitchViewProps> = ({
  players,
  formation,
  captainId,
  viceCaptainId,
  onPlayerClick,
  className,
}) => {
  // Group players by position
  const playersByPosition = {
    GK: players.filter(p => p.position === "GK"),
    DEF: players.filter(p => p.position === "DEF"),
    MID: players.filter(p => p.position === "MID"),
    FWD: players.filter(p => p.position === "FWD"),
  }

  // Get formation-specific layout
  const getFormationLayout = () => {
    const defCount = formation.def
    const midCount = formation.mid
    const fwdCount = formation.fwd

    // Calculate positions based on count
    const defPositions = Array.from({ length: defCount }, (_, i) => {
      const spacing = 100 / (defCount + 1)
      return spacing * (i + 1)
    })
    
    const midPositions = Array.from({ length: midCount }, (_, i) => {
      const spacing = 100 / (midCount + 1)
      return spacing * (i + 1)
    })
    
    const fwdPositions = Array.from({ length: fwdCount }, (_, i) => {
      const spacing = 100 / (fwdCount + 1)
      return spacing * (i + 1)
    })

    return {
      GK: { y: 8, positions: [50] },
      DEF: { y: 28, positions: defPositions },
      MID: { y: 52, positions: midPositions },
      FWD: { y: 78, positions: fwdPositions },
    }
  }

  const layout = getFormationLayout()

  return (
    <div className={cn("relative w-full aspect-[3/4] rounded-xl overflow-hidden", className)}>
      {/* Pitch background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/40 via-green-800/30 to-green-900/40" />
      
      {/* Pitch pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Center circle */}
          <circle cx="50" cy="50" r="8" fill="none" stroke="white" strokeWidth="0.3" />
          {/* Center line */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.2" />
          {/* Penalty areas */}
          <rect x="0" y="35" width="12" height="30" fill="none" stroke="white" strokeWidth="0.2" />
          <rect x="88" y="35" width="12" height="30" fill="none" stroke="white" strokeWidth="0.2" />
          {/* Goal areas */}
          <rect x="0" y="42" width="4" height="16" fill="none" stroke="white" strokeWidth="0.2" />
          <rect x="96" y="42" width="4" height="16" fill="none" stroke="white" strokeWidth="0.2" />
          {/* Corner arcs */}
          <path d="M 0 0 Q 2 0 2 2" fill="none" stroke="white" strokeWidth="0.2" />
          <path d="M 100 0 Q 98 0 98 2" fill="none" stroke="white" strokeWidth="0.2" />
          <path d="M 0 100 Q 2 100 2 98" fill="none" stroke="white" strokeWidth="0.2" />
          <path d="M 100 100 Q 98 100 98 98" fill="none" stroke="white" strokeWidth="0.2" />
        </svg>
      </div>

      {/* Position labels */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-8 text-white/30 text-xs font-bold">
        <span>GK</span>
        <span>DEF</span>
        <span>MID</span>
        <span>FWD</span>
      </div>

      {/* Render players by position */}
      {Object.entries(layout).map(([position, { y, positions }]) => {
        const positionPlayers = playersByPosition[position as keyof typeof playersByPosition] || []
        
        return (
          <React.Fragment key={position}>
            {positions.map((x, index) => {
              const player = positionPlayers[index]
              
              return (
                <motion.div
                  key={`${position}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="absolute"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {player ? (
                    <div className="w-20">
                      <PlayerCard
                        player={player}
                        isCaptain={player.id === captainId}
                        isViceCaptain={player.id === viceCaptainId}
                        onClick={() => onPlayerClick?.(player)}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-20 rounded-lg bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                      <span className="text-white/20 text-xs">{position}</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </React.Fragment>
        )
      })}

      {/* Formation label */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
        <span className="text-white text-sm font-bold">{formation.name}</span>
      </div>
    </div>
  )
}

