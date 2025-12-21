"use client"

import React from "react"
import { motion } from "framer-motion"
import { PlayerChip } from "./PlayerChip"
import { PlayerDetail, Formation } from "@/types/team"
import { cn } from "@/lib/utils"

interface EnhancedPitchProps {
  players: PlayerDetail[]
  formation: Formation
  captainId?: number | null
  viceCaptainId?: number | null
  highlightedPlayerIds?: Set<number>
  selectedPlayerId?: number | null
  onPlayerClick?: (player: PlayerDetail) => void
  onPlayerHover?: (player: PlayerDetail | null) => void
  className?: string
}

export const EnhancedPitch: React.FC<EnhancedPitchProps> = ({
  players,
  formation,
  captainId,
  viceCaptainId,
  highlightedPlayerIds,
  selectedPlayerId,
  onPlayerClick,
  onPlayerHover,
  className,
}) => {
  // Group players by position
  const playersByPosition = {
    GK: players.filter(p => p.position === "GK"),
    DEF: players.filter(p => p.position === "DEF"),
    MID: players.filter(p => p.position === "MID"),
    FWD: players.filter(p => p.position === "FWD"),
  }

  // Get formation-specific layout using flexbox-based centering
  const getFormationLayout = () => {
    const defCount = formation.def
    const midCount = formation.mid
    const fwdCount = formation.fwd

    // Calculate horizontal positions: center the group, then space players equally
    const calculatePositions = (count: number): number[] => {
      if (count <= 1) return [50]
      
      // Calculate spacing between players (equal spacing)
      // Use safe margins, but widen for 5-player lines (MID in 3-5-2 etc.)
      // to avoid PlayerChip text overlap.
      // For 5-player lines, keep them wide but prevent edge clipping.
      const minMargin = count >= 5 ? 3 :3
      const maxMargin = count >= 5 ? 97 : 97
      const usableWidth = maxMargin - minMargin // 76% usable width
      
      // Equal spacing between players
      const spacing = count > 1 ? usableWidth / (count - 1) : 0
      
      // Calculate total width needed for all players
      const totalWidth = spacing * (count - 1)
      
      // Center the group: start position = 50% - (totalWidth / 2)
      const start = 50 - (totalWidth / 2)
      
      return Array.from({ length: count }, (_, i) => start + (spacing * i))
    }

    // Calculate positions with perspective (closer to camera = higher z-index)
    const defPositions = Array.from({ length: defCount }, (_, i) => {
      return { x: calculatePositions(defCount)[i], z: 0.8 } // Defenders closer
    })
    
    const midPositions = Array.from({ length: midCount }, (_, i) => {
      return { x: calculatePositions(midCount)[i], z: 0.6 } // Midfielders middle
    })
    
    const fwdPositions = Array.from({ length: fwdCount }, (_, i) => {
      return { x: calculatePositions(fwdCount)[i], z: 0.4 } // Forwards further
    })

    // Vertical positioning: optimized spacing for realistic pitch layout
    // GK near top, DEF in defensive third, MID in center, FWD in attacking third
    return {
      // Formation positioned with realistic pitch spacing
      GK: { y: 12, positions: [{ x: 50, z: 1.0 }] },        // Near top goal line
      DEF: { y: 32, positions: defPositions },              // Defensive third
      MID: { y: 52, positions: midPositions },               // Center of pitch
      FWD: { y: 72, positions: fwdPositions },               // Attacking third
    }
  }

  const layout = getFormationLayout()

  return (
    <div className={cn("relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-green-600/30 shadow-2xl", className)}>
      {/* Realistic pitch background */}
      <div className="absolute inset-0">
        {/* Base grass layer with realistic gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-700 via-green-600 to-green-700" />
        
        {/* Grass texture pattern */}
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                rgba(34, 139, 34, 0.3) 0px,
                rgba(50, 205, 50, 0.2) 1px,
                rgba(34, 139, 34, 0.3) 2px,
                rgba(144, 238, 144, 0.1) 3px
              ),
              repeating-linear-gradient(
                90deg,
                rgba(50, 205, 50, 0.15) 0px,
                rgba(34, 139, 34, 0.25) 1px,
                rgba(50, 205, 50, 0.15) 2px
              )
            `,
            backgroundSize: "6px 6px, 6px 6px",
          }}
        />
        
        {/* Subtle grass mowing pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 20px,
              rgba(255, 255, 255, 0.03) 20px,
              rgba(255, 255, 255, 0.03) 21px
            )`,
          }}
        />
        
        {/* Subtle lighting gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
      </div>
      
      {/* Professional pitch markings */}
      <div className="absolute inset-0 opacity-70">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <filter id="pitch-shadow">
              <feDropShadow dx="0.1" dy="0.1" stdDeviation="0.2" floodOpacity="0.6" floodColor="white"/>
            </filter>
          </defs>
          
          {/* Center circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="9" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.3"
            filter="url(#pitch-shadow)"
          />
          <circle 
            cx="50" 
            cy="50" 
            r="0.5" 
            fill="white"
            filter="url(#pitch-shadow)"
          />
          
          {/* Penalty areas (top/bottom) */}
          <rect 
            x="32" 
            y="0" 
            width="36" 
            height="16" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.3"
            filter="url(#pitch-shadow)"
          />
          <rect 
            x="32" 
            y="84" 
            width="36" 
            height="16" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.3"
            filter="url(#pitch-shadow)"
          />
          
          {/* Goal areas */}
          <rect 
            x="40" 
            y="0" 
            width="20" 
            height="5" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.3"
            filter="url(#pitch-shadow)"
          />
          <rect 
            x="40" 
            y="95" 
            width="20" 
            height="5" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.3"
            filter="url(#pitch-shadow)"
          />
          
          {/* Penalty spots */}
          <circle cx="50" cy="11" r="0.4" fill="white" filter="url(#pitch-shadow)" />
          <circle cx="50" cy="89" r="0.4" fill="white" filter="url(#pitch-shadow)" />
          
          {/* Corner arcs */}
          <path d="M 0 0 Q 3 0 3 3" fill="none" stroke="white" strokeWidth="0.3" filter="url(#pitch-shadow)" />
          <path d="M 100 0 Q 97 0 97 3" fill="none" stroke="white" strokeWidth="0.3" filter="url(#pitch-shadow)" />
          <path d="M 0 100 Q 3 100 3 97" fill="none" stroke="white" strokeWidth="0.3" filter="url(#pitch-shadow)" />
          <path d="M 100 100 Q 97 100 97 97" fill="none" stroke="white" strokeWidth="0.3" filter="url(#pitch-shadow)" />
        </svg>
      </div>

      {/* Position zone indicators - subtle */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-12 text-white/20 text-xs font-semibold">
        {["GK", "DEF", "MID", "FWD"].map((pos) => (
          <span key={pos} className="drop-shadow-sm">
            {pos}
          </span>
        ))}
      </div>

      {/* Render players by position with staggered animations */}
      {Object.entries(layout).map(([position, { y, positions }]) => {
        const positionPlayers = playersByPosition[position as keyof typeof playersByPosition] || []
        const totalPlayers = positions.length
        
        // Default spacing (original behavior): use a slightly left-shifted center and compressed widths.
        // We only override this for the 5-MID line to spread them wider and avoid text overlap.
        const getPlayerLeft = (index: number): string => {
          const centerX = 38
          if (totalPlayers === 1) return `${centerX}%`

          // Dynamic spacing based on player count:
          // - 2 players: closer together
          // - 3/4/5 players: progressively wider, capped
          const widthMultiplier =
            totalPlayers === 2 ? 0.30 : Math.min(0.75, 0.50 + (totalPlayers - 2) * 0.05)
          const totalWidth = widthMultiplier * 100
          const spacing = totalPlayers > 1 ? totalWidth / (totalPlayers - 1) : 0

          const centerIndex = (totalPlayers - 1) / 2
          const offsetFromCenter = (index - centerIndex) * spacing
          return `calc(${centerX}% + ${offsetFromCenter}%)`
        }

        // Special-case the 5-midfield line:
        // - Center it exactly where other lines are centered (centerX=38)
        // - Spread it wider than the default (to avoid text overlap)
        // - Keep it on-screen (avoid clipping on the right)
        const getMid5Left = (index: number): string => {
          const centerX = 38
          const totalWidth = 75 // percent of container width used by the whole line
          const spacing = totalWidth / 4 // 5 players => 4 gaps
          const centerIndex = 2
          const offsetFromCenter = (index - centerIndex) * spacing
          return `calc(${centerX}% + ${offsetFromCenter}%)`
        }
        
        return (
          <div
            key={position}
            className="absolute left-0 right-0 flex items-center justify-center"
            style={{
              top: `${y}%`,
              transform: "translateY(-50%)",
            }}
          >
            {positions.map((pos, index) => {
              const player = positionPlayers[index]
              const isSelected = player?.id === selectedPlayerId
              const isCaptain = player?.id === captainId
              const isViceCaptain = player?.id === viceCaptainId
              const isTransferredIn = !!player && !!highlightedPlayerIds && highlightedPlayerIds.has(player.id)
              
              return (
                <motion.div
                  key={`${position}-${index}`}
                  initial={{ opacity: 0, scale: 0.8, y: 20, rotateY: -90 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    rotateY: 0,
                    zIndex: isSelected ? 50 : Math.floor(pos.z * 10),
                  }}
                  transition={{ 
                    delay: index * 0.1 + (position === "GK" ? 0 : position === "DEF" ? 0.2 : position === "MID" ? 0.4 : 0.6),
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="absolute"
                  style={{
                    // Only widen the 5-midfield line; keep the rest as the original layout.
                    left: position === "MID" && totalPlayers === 5 ? getMid5Left(index) : getPlayerLeft(index),
                    transform: "translateX(-50%)",
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                  }}
                  onMouseEnter={() => player && onPlayerHover?.(player)}
                  onMouseLeave={() => onPlayerHover?.(null)}
                >
                  {player ? (
                    <div className="relative flex flex-col items-center">
                      {/* Subtle glow effect for captain/selected */}
                      {(isSelected || isCaptain || isViceCaptain) && (
                        <motion.div
                          className={cn(
                            "absolute inset-0 rounded-xl blur-xl -z-10",
                            isCaptain && "bg-yellow-400/40",
                            isViceCaptain && "bg-blue-400/40",
                            isSelected && !isCaptain && !isViceCaptain && "bg-white/20"
                          )}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.4, 0.7, 0.4],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                      <PlayerChip
                        player={player}
                        isCaptain={isCaptain}
                        isViceCaptain={isViceCaptain}
                        isSelected={isSelected}
                        transferBadge={isTransferredIn ? "in" : null}
                        onSelect={() => onPlayerClick?.(player)}
                        className="relative z-10"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-32 rounded-lg bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white/15 text-xs">{position}</span>
                    </div>
                  )}
                  </motion.div>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}
