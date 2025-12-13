"use client"

import React from "react"
import { Card } from "@/components/ui/Card"
import { cn } from "@/lib/utils"

interface FixtureData {
  gameweek: number
  difficulty: number // 1-5
  opponent: string
  isHome: boolean
}

interface FixtureHeatmapProps {
  fixtures: FixtureData[]
  title?: string
}

export const FixtureHeatmap: React.FC<FixtureHeatmapProps> = ({
  fixtures,
  title = "Fixture Difficulty (Next 5 GWs)",
}) => {
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "bg-green-500"
    if (difficulty <= 3) return "bg-yellow-500"
    if (difficulty <= 4) return "bg-orange-500"
    return "bg-red-500"
  }

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return "Easy"
    if (difficulty <= 3) return "Medium"
    if (difficulty <= 4) return "Hard"
    return "Very Hard"
  }

  if (!fixtures || fixtures.length === 0) {
    return (
      <Card variant="glass">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="h-[200px] flex items-center justify-center text-white/50">
          No fixture data available
        </div>
      </Card>
    )
  }

  return (
    <Card variant="glass">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-5 gap-3">
        {fixtures.map((fixture) => (
          <div
            key={fixture.gameweek}
            className="text-center"
          >
            <div className="text-white/70 text-xs mb-2">GW{fixture.gameweek}</div>
            <div
              className={cn(
                "h-16 rounded-lg flex flex-col items-center justify-center text-white text-xs font-semibold transition-all hover:scale-110",
                getDifficultyColor(fixture.difficulty)
              )}
            >
              <div>{fixture.opponent}</div>
              <div className="text-xs opacity-80">{fixture.isHome ? "H" : "A"}</div>
            </div>
            <div className="text-white/50 text-xs mt-1">
              {getDifficultyLabel(fixture.difficulty)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-6 text-xs text-white/70">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span>Easy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded" />
          <span>Hard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded" />
          <span>Very Hard</span>
        </div>
      </div>
    </Card>
  )
}

