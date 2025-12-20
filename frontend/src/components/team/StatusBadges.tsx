"use client"

import React from "react"
import { Crown, AlertCircle } from "lucide-react"
import { PlayerDetail } from "@/types/team"
import { cn } from "@/lib/utils"

interface StatusBadgesProps {
  player: PlayerDetail
  isCaptain?: boolean
  isViceCaptain?: boolean
  className?: string
}

export function StatusBadges({ 
  player, 
  isCaptain = false, 
  isViceCaptain = false,
  className 
}: StatusBadgesProps) {
  const badges: React.ReactNode[] = []
  
  // Captain badge
  if (isCaptain) {
    badges.push(
      <div
        key="captain"
        className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-yellow-600 z-20"
        title="Captain"
      >
        C
      </div>
    )
  }
  
  // Vice-captain badge
  if (isViceCaptain && !isCaptain) {
    badges.push(
      <div
        key="vice-captain"
        className="absolute -top-1 -right-1 bg-blue-400 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-blue-600 z-20"
        title="Vice Captain"
      >
        V
      </div>
    )
  }
  
  // Injury/suspension badge
  if (player.status !== "a") {
    const statusConfig = {
      i: { color: "bg-red-500 text-white", icon: "!", title: "Injured" },
      s: { color: "bg-orange-500 text-white", icon: "!", title: "Suspended" },
      d: { color: "bg-yellow-500 text-yellow-900", icon: "?", title: "Doubtful" },
      u: { color: "bg-gray-500 text-white", icon: "!", title: "Unavailable" },
    }
    
    const config = statusConfig[player.status] || statusConfig.i
    const position = badges.length > 0 ? "-top-1 -left-1" : "-top-1 -right-1"
    
    badges.push(
      <div
        key="status"
        className={cn(
          "absolute rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white z-20",
          config.color,
          position
        )}
        title={config.title}
      >
        {config.icon}
      </div>
    )
  }
  
  // Yellow card badge
  if (player.yellow_cards && player.yellow_cards > 0) {
    const position = badges.length === 1 ? "-top-1 -left-1" : 
                     badges.length === 2 ? "top-4 -right-1" : 
                     "-bottom-1 -right-1"
    
    badges.push(
      <div
        key="yellow-card"
        className={cn(
          "absolute bg-yellow-400 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-yellow-600 z-20",
          position
        )}
        title={`${player.yellow_cards} Yellow Card${player.yellow_cards > 1 ? 's' : ''}`}
      >
        Y
      </div>
    )
  }
  
  if (badges.length === 0) return null
  
  return (
    <div className={cn("relative", className)}>
      {badges}
    </div>
  )
}

