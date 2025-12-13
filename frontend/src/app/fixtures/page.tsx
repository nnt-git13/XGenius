"use client"

import React from "react"
import { motion } from "framer-motion"
import { Calendar, TrendingUp, TrendingDown, Home, MapPin } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { FixtureHeatmap } from "@/components/charts/FixtureHeatmap"
import { cn } from "@/lib/utils"

const mockFixtures = [
  { gw: 8, home: "ARS", away: "CHE", difficulty: 3, isHome: true },
  { gw: 9, home: "MCI", away: "ARS", difficulty: 4, isHome: false },
  { gw: 10, home: "ARS", away: "BUR", difficulty: 2, isHome: true },
  { gw: 11, home: "SHU", away: "ARS", difficulty: 2, isHome: false },
  { gw: 12, home: "ARS", away: "LIV", difficulty: 4, isHome: true },
]

const teamFixtures = [
  { team: "Arsenal", fixtures: mockFixtures },
  { team: "Man City", fixtures: mockFixtures.map(f => ({ ...f, isHome: !f.isHome })) },
  { team: "Liverpool", fixtures: mockFixtures },
]

export default function FixturesPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-premier opacity-10" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold gradient-text-premier">Fixtures</h1>
              <p className="text-white/70">Fixture difficulty and opponent analysis</p>
            </div>
          </div>
        </motion.div>

        {/* Fixture Difficulty Overview */}
        <div className="mb-8">
          <FixtureHeatmap
            fixtures={mockFixtures.map(f => ({
              gameweek: f.gw,
              difficulty: f.difficulty,
              opponent: f.isHome ? f.away : f.home,
              isHome: f.isHome,
            }))}
            title="Upcoming Fixtures (Next 5 GWs)"
          />
        </div>

        {/* Detailed Fixtures */}
        <div className="grid lg:grid-cols-3 gap-6">
          {teamFixtures.map((teamData, teamIndex) => (
            <motion.div
              key={teamData.team}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: teamIndex * 0.1 }}
            >
              <Card variant="glass">
                <h3 className="text-xl font-bold text-white mb-4">{teamData.team}</h3>
                <div className="space-y-3">
                  {teamData.fixtures.map((fixture, index) => {
                    const getDifficultyColor = (diff: number) => {
                      if (diff <= 2) return "text-green-400"
                      if (diff <= 3) return "text-yellow-400"
                      if (diff <= 4) return "text-orange-400"
                      return "text-red-400"
                    }

                    return (
                      <div
                        key={index}
                        className="p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-sm">GW{fixture.gw}</span>
                          <span className={cn("text-sm font-semibold", getDifficultyColor(fixture.difficulty))}>
                            {fixture.difficulty <= 2 ? "Easy" : fixture.difficulty <= 3 ? "Medium" : fixture.difficulty <= 4 ? "Hard" : "Very Hard"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {fixture.isHome ? (
                              <>
                                <Home className="h-4 w-4 text-fpl-green" />
                                <span className="text-white font-semibold">{fixture.home}</span>
                                <span className="text-white/50">vs</span>
                                <span className="text-white/70">{fixture.away}</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="h-4 w-4 text-orange-400" />
                                <span className="text-white/70">{fixture.away}</span>
                                <span className="text-white/50">vs</span>
                                <span className="text-white font-semibold">{fixture.home}</span>
                              </>
                            )}
                          </div>
                          {fixture.difficulty <= 2 ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                          ) : fixture.difficulty >= 4 ? (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

