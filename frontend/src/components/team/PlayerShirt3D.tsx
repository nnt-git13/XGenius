"use client"

import React, { Suspense } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { Crown, AlertCircle } from "lucide-react"
import * as THREE from "three"
import { PlayerDetail } from "@/types/team"
import { cn } from "@/lib/utils"
import { ShirtCanvas } from "./ShirtCanvas"

interface PlayerShirt3DProps {
  player: PlayerDetail
  isCaptain?: boolean
  isViceCaptain?: boolean
  isSelected?: boolean
  isBench?: boolean
  onClick?: () => void
  className?: string
}

// Team color mappings with crest URLs
const TEAM_COLORS: Record<string, { 
  primary: string
  secondary: string
  accent: string
  pattern: "solid" | "stripes" | "hoops" | "sash"
  crest?: string
}> = {
  "Arsenal": { 
    primary: "#EF0107", 
    secondary: "#FFFFFF", 
    accent: "#023474", 
    pattern: "solid",
  },
  "Aston Villa": { 
    primary: "#95BFE5", 
    secondary: "#670E36", 
    accent: "#FFB612", 
    pattern: "stripes",
  },
  "Bournemouth": { 
    primary: "#DA020E", 
    secondary: "#000000", 
    accent: "#E62333", 
    pattern: "stripes"
  },
  "Brentford": { 
    primary: "#E30613", 
    secondary: "#FFFFFF", 
    accent: "#FFD700", 
    pattern: "stripes"
  },
  "Brighton": { 
    primary: "#0057B8", 
    secondary: "#FFFFFF", 
    accent: "#FFCD00", 
    pattern: "stripes"
  },
  "Burnley": { 
    primary: "#6C1D45", 
    secondary: "#99D6EA", 
    accent: "#FFFFFF", 
    pattern: "solid"
  },
  "Chelsea": { 
    primary: "#034694", 
    secondary: "#FFFFFF", 
    accent: "#ED1C24", 
    pattern: "solid",
  },
  "Crystal Palace": { 
    primary: "#1B458F", 
    secondary: "#C4122E", 
    accent: "#FFFFFF", 
    pattern: "stripes"
  },
  "Everton": { 
    primary: "#003399", 
    secondary: "#FFFFFF", 
    accent: "#FFCC00", 
    pattern: "solid"
  },
  "Fulham": { 
    primary: "#FFFFFF", 
    secondary: "#000000", 
    accent: "#CC0000", 
    pattern: "solid"
  },
  "Liverpool": { 
    primary: "#C8102E", 
    secondary: "#FFFFFF", 
    accent: "#00B2A9", 
    pattern: "solid",
  },
  "Luton": { 
    primary: "#FF8C00", 
    secondary: "#000000", 
    accent: "#FFFFFF", 
    pattern: "solid"
  },
  "Man City": { 
    primary: "#6CABDD", 
    secondary: "#FFFFFF", 
    accent: "#FFE066", 
    pattern: "solid",
  },
  "Man Utd": { 
    primary: "#DA020E", 
    secondary: "#FFFFFF", 
    accent: "#FBE122", 
    pattern: "solid",
  },
  "Newcastle": { 
    primary: "#241F20", 
    secondary: "#FFFFFF", 
    accent: "#00B8E6", 
    pattern: "stripes",
  },
  "Nott'm Forest": { 
    primary: "#DD0000", 
    secondary: "#FFFFFF", 
    accent: "#FFFFFF", 
    pattern: "solid"
  },
  "Sheffield Utd": { 
    primary: "#EE2737", 
    secondary: "#FFFFFF", 
    accent: "#000000", 
    pattern: "stripes"
  },
  "Spurs": { 
    primary: "#132257", 
    secondary: "#FFFFFF", 
    accent: "#E30613", 
    pattern: "solid",
  },
  "West Ham": { 
    primary: "#7A263A", 
    secondary: "#1BB1E7", 
    accent: "#FFFFFF", 
    pattern: "stripes"
  },
  "Wolves": { 
    primary: "#FDB913", 
    secondary: "#231F20", 
    accent: "#FFFFFF", 
    pattern: "solid"
  },
}

// Create procedural shirt geometry - simpler and more reliable
function createShirtGeometry() {
  // Use a box geometry with custom shape for better performance
  const geometry = new THREE.BoxGeometry(0.8, 1.2, 0.2, 4, 6, 1)
  
  // Modify vertices to create shirt shape (wider at top, narrower at bottom)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    
    // Taper the sides based on Y position
    if (Math.abs(x) > 0.3) {
      const taper = 1 - (y + 0.6) * 0.3 // More taper at bottom
      positions.setX(i, x * taper)
    }
    
    // Round the top for neck
    if (y > 0.4) {
      const neckTaper = 1 - (y - 0.4) * 0.5
      positions.setX(i, x * neckTaper)
    }
  }
  
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  
  return geometry
}


export const PlayerShirt3D: React.FC<PlayerShirt3DProps> = ({
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
  const playerNumber = player.id % 99 || 1

  return (
    <motion.div
      whileHover={{ scale: 1.1, y: -10 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn("relative cursor-pointer w-20 h-28", className)}
    >
      {/* 3D Canvas */}
      <div className="w-full h-full relative">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-lg">
            <div className="text-white/50 text-xs">Loading...</div>
          </div>
        }>
          <ShirtCanvas
            teamName={player.team}
            teamFplCode={player.team_fpl_code}
            teamColors={teamColors}
            playerNumber={playerNumber}
            isSelected={isSelected}
            isCaptain={isCaptain}
            isViceCaptain={isViceCaptain}
          />
        </Suspense>
      </div>
      
      {/* Overlay badges */}
      <div className="absolute top-0 right-0 z-10">
        {isCaptain && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Crown className="h-4 w-4 text-yellow-400 drop-shadow-lg" />
          </motion.div>
        )}
        {isViceCaptain && !isCaptain && (
          <Crown className="h-4 w-4 text-blue-400 drop-shadow-lg" />
        )}
      </div>
      
      {/* Status indicator */}
      {player.status !== "a" && (
        <div className="absolute top-0 left-0 z-10">
          <AlertCircle className={cn(
            "h-3 w-3",
            player.status === "i" ? "text-red-400" :
            player.status === "s" ? "text-yellow-400" :
            player.status === "d" ? "text-orange-400" : "text-gray-400"
          )} />
        </div>
      )}
      
      {/* Player name */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm px-1 py-0.5 rounded-b-lg border-t border-white/20">
        <p className="text-white text-[8px] font-bold text-center truncate">
          {player.name.split(" ").pop() || player.name}
        </p>
      </div>
    </motion.div>
  )
}
