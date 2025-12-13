"use client"

import React from "react"
import { motion } from "framer-motion"
import { PlayerCard } from "./PlayerCard"
import { PlayerDetail } from "@/types/team"

interface BenchViewProps {
  players: PlayerDetail[]
  captainId?: number | null
  viceCaptainId?: number | null
  onPlayerClick?: (player: PlayerDetail) => void
  className?: string
}

export const BenchView: React.FC<BenchViewProps> = ({
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
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>Bench</span>
        <span className="text-sm text-white/50 font-normal">({players.length}/4)</span>
      </h3>
      <div className="grid grid-cols-4 gap-4">
        {benchSlots.map((player, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {player ? (
              <PlayerCard
                player={player}
                isBench={true}
                isCaptain={player.id === captainId}
                isViceCaptain={player.id === viceCaptainId}
                onClick={() => onPlayerClick?.(player)}
                className="h-full"
              />
            ) : (
              <div className="aspect-[3/4] rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                <span className="text-white/30 text-sm">Bench {index + 1}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

