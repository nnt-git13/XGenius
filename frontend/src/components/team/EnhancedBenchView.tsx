"use client"

import React from "react"
import { motion } from "framer-motion"
import { PlayerShirt3D } from "./PlayerShirt3D"
import { PlayerDetail } from "@/types/team"

interface EnhancedBenchViewProps {
  players: PlayerDetail[]
  captainId?: number | null
  viceCaptainId?: number | null
  onPlayerClick?: (player: PlayerDetail) => void
  className?: string
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
      
      {/* Bench with 3D grass background */}
      <div className="relative rounded-xl overflow-hidden">
        {/* Bench grass background */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-800 via-green-700 to-green-800 opacity-60" />
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                rgba(22, 163, 74, 0.3) 0px,
                rgba(34, 197, 94, 0.2) 1px,
                rgba(22, 163, 74, 0.3) 2px
              )
            `,
            backgroundSize: "3px 3px",
          }}
        />
        
        {/* Bench seats effect */}
        <div className="absolute inset-0 border-t-4 border-white/20" />
        
        <div className="relative grid grid-cols-4 gap-4 p-4">
          {benchSlots.map((player, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30, rotateY: -90 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ 
                delay: index * 0.15,
                type: "spring",
                stiffness: 150,
                damping: 12,
              }}
              className="flex justify-center"
            >
              {player ? (
                <div className="relative">
                  {/* Bench number indicator */}
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-20 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/30">
                    <span className="text-white text-[10px] font-bold">{index + 1}</span>
                  </div>
                  <PlayerShirt3D
                    player={player}
                    isBench={true}
                    isCaptain={player.id === captainId}
                    isViceCaptain={player.id === viceCaptainId}
                    onClick={() => onPlayerClick?.(player)}
                    className="opacity-90 hover:opacity-100 transition-opacity"
                  />
                </div>
              ) : (
                <div className="relative w-20 h-28 rounded-lg bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center backdrop-blur-sm">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/30">
                    <span className="text-white text-[10px] font-bold">{index + 1}</span>
                  </div>
                  <span className="text-white/30 text-xs mt-4">Bench {index + 1}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

