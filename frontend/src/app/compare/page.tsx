"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Users, TrendingUp, Target, X } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { TeamRadarChart } from "@/components/charts/RadarChart"
import { cn } from "@/lib/utils"

const mockPlayers = [
  { id: 1, name: "Erling Haaland", position: "FWD", team: "MCI", price: 140, predicted: 8.5, form: 7.2, xG: 0.65, xA: 0.15 },
  { id: 2, name: "Ollie Watkins", position: "FWD", team: "AVL", price: 85, predicted: 7.5, form: 8.2, xG: 0.52, xA: 0.20 },
  { id: 3, name: "Alexander Isak", position: "FWD", team: "NEW", price: 75, predicted: 7.2, form: 6.8, xG: 0.48, xA: 0.12 },
]

export default function ComparePage() {
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([])

  const togglePlayer = (id: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  const compareData = selectedPlayers.map((id) => {
    const player = mockPlayers.find((p) => p.id === id)
    if (!player) return null
    return {
      category: player.name,
      value: player.predicted * 10,
    }
  }).filter(Boolean)

  const selectedPlayerData = selectedPlayers
    .map((id) => mockPlayers.find((p) => p.id === id))
    .filter(Boolean)

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
            <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold gradient-text-premier">Compare Players</h1>
              <p className="text-white/70">Compare up to 3 players side by side</p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Player Selection */}
          <div className="lg:col-span-1">
            <Card variant="glass">
              <h3 className="text-xl font-bold text-white mb-4">Select Players (max 3)</h3>
              <div className="space-y-3">
                {mockPlayers.map((player) => {
                  const isSelected = selectedPlayers.includes(player.id)
                  const isDisabled = !isSelected && selectedPlayers.length >= 3
                  return (
                    <button
                      key={player.id}
                      onClick={() => !isDisabled && togglePlayer(player.id)}
                      disabled={isDisabled}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-all",
                        isSelected
                          ? "border-fpl-green bg-fpl-green/10"
                          : isDisabled
                          ? "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-semibold">{player.name}</p>
                          <p className="text-white/70 text-sm">
                            {player.position} • {player.team}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-fpl-green flex items-center justify-center">
                            <X className="h-4 w-4 text-black" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">£{(player.price / 10).toFixed(1)}M</span>
                        <span className="text-fpl-green font-semibold">
                          {player.predicted} pts
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Comparison View */}
          <div className="lg:col-span-2">
            {selectedPlayers.length > 0 ? (
              <>
                {/* Stats Table */}
                <Card variant="glass" className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">Stats Comparison</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-white/70">Stat</th>
                          {selectedPlayerData.map((player) => (
                            <th key={player!.id} className="text-right py-3 px-4 text-white font-semibold">
                              {player!.name.split(" ")[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Predicted Points", key: "predicted" },
                          { label: "Form", key: "form" },
                          { label: "Price", key: "price", format: (v: number) => `£${(v / 10).toFixed(1)}M` },
                          { label: "xG per 90", key: "xG" },
                          { label: "xA per 90", key: "xA" },
                        ].map((stat) => (
                          <tr key={stat.key} className="border-b border-white/5">
                            <td className="py-3 px-4 text-white/70">{stat.label}</td>
                            {selectedPlayerData.map((player: any) => (
                              <td key={player.id} className="text-right py-3 px-4 text-white">
                                {stat.format
                                  ? stat.format(player[stat.key])
                                  : typeof player[stat.key] === "number"
                                  ? player[stat.key].toFixed(2)
                                  : player[stat.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Radar Chart */}
                {selectedPlayers.length >= 2 && (
                  <Card variant="glass">
                    <h3 className="text-xl font-bold text-white mb-4">Attribute Comparison</h3>
                    <TeamRadarChart
                      data={selectedPlayers.map((id) => {
                        const player = mockPlayers.find((p) => p.id === id)!
                        return {
                          category: player.name.split(" ")[0],
                          value: player.predicted * 10,
                        }
                      })}
                    />
                  </Card>
                )}
              </>
            ) : (
              <Card variant="glass" className="min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-16 w-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/70 text-lg">
                    Select players to compare their stats and attributes
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}





