"use client"

import React from "react"
import { PlayerDetail } from "@/types/team"
import { getTeamAbbreviation } from "@/utils/teamMapping"
import { cn } from "@/lib/utils"

interface PlayerLabelProps {
  player: PlayerDetail
  isCaptain?: boolean
  isViceCaptain?: boolean
  className?: string
}

export function PlayerLabel({ 
  player, 
  isCaptain = false, 
  isViceCaptain = false,
  className 
}: PlayerLabelProps) {
  const teamShort = getTeamAbbreviation(player.team)
  
  // Get fixture info
  const opponent = player.next_fixture_opponent_short || player.next_fixture_opponent?.slice(0, 3).toUpperCase() || "—"
  const homeAway = player.next_fixture_home_away || null
  
  // Player name - use last name if available
  const playerName = player.name.split(" ").pop() || player.name
  
  return (
    <div className={cn("flex flex-col items-center gap-1 mt-2", className)}>
      {/* Player name and team */}
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-md px-2 py-1 border border-gray-700/50 shadow-lg min-w-[120px]">
        <div className="text-white text-xs font-semibold text-center leading-tight">
          {playerName}
        </div>
        <div className="text-gray-400 text-[10px] text-center mt-0.5">
          {teamShort}
        </div>
      </div>
      
      {/* Fixture info */}
      {(opponent && opponent !== "—") && (
        <div className="bg-blue-900/80 backdrop-blur-sm rounded px-2 py-0.5 border border-blue-700/50 shadow-md">
          <div className="text-white text-[10px] font-medium text-center">
            {opponent} {homeAway && `(${homeAway})`}
          </div>
        </div>
      )}
    </div>
  )
}
