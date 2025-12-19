"use client"

import React from "react"
import { motion } from "framer-motion"
import { PlayerChip } from "./PlayerChip"
import { PlayerDetail } from "@/types/team"

interface EnhancedBenchViewProps {
  players: PlayerDetail[]
  captainId?: number | null
  viceCaptainId?: number | null
  onPlayerClick?: (player: PlayerDetail) => void
  className?: string
}

// Map position to bench label
const getBenchLabel = (position: string, index: number): string => {
  const positionMap: Record<string, string> = {
    "GK": "GKP",
    "DEF": "DEF",
    "MID": "MID",
    "FWD": "FWD",
  }
  return positionMap[position] || `${index + 1}.`
}

export const EnhancedBenchView: React.FC<EnhancedBenchViewProps> = ({
  players,
  captainId,
  viceCaptainId,
  onPlayerClick,
  className,
}) => {
  // Ensure we have exactly 4 bench slots (FPL standard)
  const benchSlots = Array.from({ length: 4 }, (_, i) => players[i] || null)

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Bench</span>
          <span className="text-sm text-white/50 font-normal">({players.length}/4)</span>
        </h3>
      </div>
      
      {/* Bench with realistic styling */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-green-800 via-green-700 to-green-800 border border-green-600/30">
        {/* Bench grass background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                rgba(22, 163, 74, 0.3) 0px,
                rgba(34, 197, 94, 0.2) 1px,
                rgba(22, 163, 74, 0.3) 2px
              )
            `,
            backgroundSize: "4px 4px",
          }}
        />
        
        {/* Bench separator line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-white/20" />
        
        <div className="relative grid grid-cols-4 gap-3 p-4">
          {benchSlots.map((player, index) => {
            const label = player ? getBenchLabel(player.position, index) : `${index + 1}.`
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
                className="flex flex-col items-center"
              >
                {/* Position label */}
                <div className="mb-2 bg-gray-800/80 backdrop-blur-sm px-2 py-0.5 rounded border border-gray-600/50 shadow-sm">
                  <span className="text-white text-[10px] font-bold">{label}</span>
                </div>
                
                {player ? (
                  <div className="w-full flex justify-center">
                    <PlayerChip
                      player={player}
                      isBench={true}
                      isCaptain={player.id === captainId}
                      isViceCaptain={player.id === viceCaptainId}
                      onSelect={() => onPlayerClick?.(player)}
                      className="opacity-90 hover:opacity-100 transition-opacity"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-28 rounded-lg bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white/20 text-xs">Empty</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

