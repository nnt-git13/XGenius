"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Zap, Calendar, Target, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

const chips = [
  {
    id: "wildcard",
    name: "Wildcard",
    used: false,
    description: "Make unlimited free transfers this gameweek",
    recommendedGw: 9,
    reason: "Fixture swings favor strong teams",
  },
  {
    id: "freehit",
    name: "Free Hit",
    used: false,
    description: "Make unlimited transfers for one gameweek only",
    recommendedGw: 18,
    reason: "Blank gameweek expected",
  },
  {
    id: "benchboost",
    name: "Bench Boost",
    used: true,
    description: "Get points from all 15 players this gameweek",
    recommendedGw: null,
    reason: "Already used",
  },
  {
    id: "triplecaptain",
    name: "Triple Captain",
    used: false,
    description: "Your captain scores triple points",
    recommendedGw: 34,
    reason: "Double gameweek with strong fixtures",
  },
]

export default function ChipsPage() {
  const [selectedChip, setSelectedChip] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-premier opacity-10" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold gradient-text-premier">Chip Strategy</h1>
              <p className="text-white/70">Plan your chip usage with AI recommendations</p>
            </div>
          </div>
        </motion.div>

        {/* Chip Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {chips.map((chip, index) => (
            <motion.div
              key={chip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                variant={chip.used ? "glass" : "neon"}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedChip === chip.id && "ring-2 ring-fpl-green",
                  chip.used && "opacity-60"
                )}
                onClick={() => !chip.used && setSelectedChip(chip.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold text-white">{chip.name}</h3>
                      {chip.used && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                          Used
                        </span>
                      )}
                    </div>
                    <p className="text-white/70 text-sm">{chip.description}</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg",
                    chip.used ? "bg-white/5" : "bg-gradient-to-br from-yellow-500/20 to-orange-500/20"
                  )}>
                    <Zap className={cn(
                      "h-6 w-6",
                      chip.used ? "text-white/30" : "text-yellow-400"
                    )} />
                  </div>
                </div>

                {chip.recommendedGw && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-fpl-green" />
                      <span className="text-white/70 text-sm">Recommended GW{chip.recommendedGw}</span>
                    </div>
                    <p className="text-white/60 text-xs">{chip.reason}</p>
                  </div>
                )}

                {chip.used && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-white/70 text-sm">Chip already used this season</span>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Strategy Recommendations */}
        <Card variant="glass">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-fpl-green" />
            AI Recommendations
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-fpl-green/10 rounded-lg border border-fpl-green/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-fpl-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold mb-1">Wildcard Recommended for GW9</p>
                  <p className="text-white/70 text-sm">
                    Fixture difficulty shifts significantly after GW8. Using your Wildcard now allows
                    you to restructure your squad for the upcoming favorable fixture runs.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold mb-1">Save Triple Captain for GW34</p>
                  <p className="text-white/70 text-sm">
                    Double gameweek expected. Save your Triple Captain chip for maximum impact when
                    premium players have two fixtures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

