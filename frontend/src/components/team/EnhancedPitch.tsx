"use client"

import React from "react"
import { motion } from "framer-motion"
import { PlayerShirt3D } from "./PlayerShirt3D"
import { PlayerDetail, Formation } from "@/types/team"
import { cn } from "@/lib/utils"

interface EnhancedPitchProps {
  players: PlayerDetail[]
  formation: Formation
  captainId?: number | null
  viceCaptainId?: number | null
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

  // Get formation-specific layout with perspective
  const getFormationLayout = () => {
    const defCount = formation.def
    const midCount = formation.mid
    const fwdCount = formation.fwd

    // Calculate positions with perspective (closer to camera = higher z-index)
    const defPositions = Array.from({ length: defCount }, (_, i) => {
      const spacing = 100 / (defCount + 1)
      return { x: spacing * (i + 1), z: 0.8 } // Defenders closer
    })
    
    const midPositions = Array.from({ length: midCount }, (_, i) => {
      const spacing = 100 / (midCount + 1)
      return { x: spacing * (i + 1), z: 0.6 } // Midfielders middle
    })
    
    const fwdPositions = Array.from({ length: fwdCount }, (_, i) => {
      const spacing = 100 / (fwdCount + 1)
      return { x: spacing * (i + 1), z: 0.4 } // Forwards further
    })

    return {
      GK: { y: 8, positions: [{ x: 50, z: 1.0 }] },
      DEF: { y: 28, positions: defPositions },
      MID: { y: 52, positions: midPositions },
      FWD: { y: 78, positions: fwdPositions },
    }
  }

  const layout = getFormationLayout()

  return (
    <div className={cn("relative w-full aspect-[3/4] rounded-2xl overflow-hidden", className)}>
      {/* Stadium backdrop with depth - multiple layers */}
      <div className="absolute inset-0">
        {/* Base grass layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-900 via-green-800 to-green-900" />
        
        {/* 3D Grass texture with depth */}
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                rgba(22, 163, 74, 0.4) 0px,
                rgba(34, 197, 94, 0.3) 1px,
                rgba(22, 163, 74, 0.4) 2px,
                rgba(16, 185, 129, 0.2) 3px
              ),
              repeating-linear-gradient(
                90deg,
                rgba(34, 197, 94, 0.2) 0px,
                rgba(22, 163, 74, 0.3) 1px,
                rgba(34, 197, 94, 0.2) 2px,
                rgba(16, 185, 129, 0.1) 3px
              )
            `,
            backgroundSize: "4px 4px, 4px 4px",
          }}
        />
        
        {/* Grass blades effect for 3D look */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 8px,
              rgba(16, 185, 129, 0.1) 8px,
              rgba(16, 185, 129, 0.1) 9px
            )`,
          }}
        />
        
        {/* Depth shadows - darker at edges */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20" />
        
        {/* Lighting from stadium lights */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(ellipse at 30% 15%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 15%, rgba(255,255,255,0.15) 0%, transparent 50%)",
              "radial-gradient(ellipse at 35% 20%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(ellipse at 65% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)",
              "radial-gradient(ellipse at 30% 15%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 15%, rgba(255,255,255,0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      
      {/* Pitch markings with depth and shadows */}
      <div className="absolute inset-0 opacity-50">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Center circle with 3D effect */}
          <defs>
            <filter id="shadow">
              <feDropShadow dx="0.2" dy="0.2" stdDeviation="0.3" floodOpacity="0.5"/>
            </filter>
          </defs>
          <circle 
            cx="50" 
            cy="50" 
            r="8" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.5"
            filter="url(#shadow)"
            className="drop-shadow-lg"
          />
          {/* Center line with depth */}
          <line 
            x1="0" 
            y1="50" 
            x2="100" 
            y2="50" 
            stroke="white" 
            strokeWidth="0.4"
            filter="url(#shadow)"
            className="drop-shadow-md"
          />
          {/* Penalty areas with 3D depth */}
          <rect 
            x="0" 
            y="35" 
            width="12" 
            height="30" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.4"
            filter="url(#shadow)"
            className="drop-shadow-md"
          />
          <rect 
            x="88" 
            y="35" 
            width="12" 
            height="30" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.4"
            filter="url(#shadow)"
            className="drop-shadow-md"
          />
          {/* Goal areas */}
          <rect 
            x="0" 
            y="42" 
            width="4" 
            height="16" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.4"
            filter="url(#shadow)"
          />
          <rect 
            x="96" 
            y="42" 
            width="4" 
            height="16" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.4"
            filter="url(#shadow)"
          />
          {/* Corner arcs */}
          <path d="M 0 0 Q 2 0 2 2" fill="none" stroke="white" strokeWidth="0.4" filter="url(#shadow)" />
          <path d="M 100 0 Q 98 0 98 2" fill="none" stroke="white" strokeWidth="0.4" filter="url(#shadow)" />
          <path d="M 0 100 Q 2 100 2 98" fill="none" stroke="white" strokeWidth="0.4" filter="url(#shadow)" />
          <path d="M 100 100 Q 98 100 98 98" fill="none" stroke="white" strokeWidth="0.4" filter="url(#shadow)" />
        </svg>
      </div>

      {/* Position zone indicators with glow */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-8 text-white/30 text-xs font-bold">
        {["GK", "DEF", "MID", "FWD"].map((pos, i) => (
          <motion.span
            key={pos}
            animate={{ 
              opacity: [0.2, 0.5, 0.2],
              textShadow: [
                "0 0 5px rgba(255,255,255,0.3)",
                "0 0 10px rgba(255,255,255,0.5)",
                "0 0 5px rgba(255,255,255,0.3)",
              ]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              delay: i * 0.5 
            }}
          >
            {pos}
          </motion.span>
        ))}
      </div>

      {/* Render players by position with staggered animations */}
      {Object.entries(layout).map(([position, { y, positions }]) => {
        const positionPlayers = playersByPosition[position as keyof typeof playersByPosition] || []
        
        return (
          <React.Fragment key={position}>
            {positions.map((pos, index) => {
              const player = positionPlayers[index]
              const isSelected = player?.id === selectedPlayerId
              const isCaptain = player?.id === captainId
              const isViceCaptain = player?.id === viceCaptainId
              
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
                    left: `${pos.x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                  }}
                  onMouseEnter={() => player && onPlayerHover?.(player)}
                  onMouseLeave={() => onPlayerHover?.(null)}
                >
                  {player ? (
                    <div className="relative">
                      {/* Enhanced glow effect for selected/captain */}
                      {(isSelected || isCaptain || isViceCaptain) && (
                        <motion.div
                          className={cn(
                            "absolute inset-0 rounded-xl blur-2xl -z-10",
                            isCaptain && "bg-yellow-400/60",
                            isViceCaptain && "bg-blue-400/60",
                            isSelected && !isCaptain && !isViceCaptain && "bg-white/40"
                          )}
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.6, 0.9, 0.6],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                      <PlayerShirt3D
                        player={player}
                        isCaptain={isCaptain}
                        isViceCaptain={isViceCaptain}
                        isSelected={isSelected}
                        onClick={() => onPlayerClick?.(player)}
                        className="relative z-10"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-28 rounded-lg bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white/20 text-xs">{position}</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </React.Fragment>
        )
      })}

      {/* Formation label with enhanced glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/15 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/30 shadow-2xl"
        style={{
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        <span className="text-white text-sm font-bold drop-shadow-lg">{formation.name}</span>
      </motion.div>
    </div>
  )
}
