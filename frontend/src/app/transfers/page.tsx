"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Search, Filter, TrendingUp, TrendingDown, Star, ArrowUpDown } from "lucide-react"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { Input } from "@/components/ui/Input"
import { cn } from "@/lib/utils"

// Mock player data
const mockPlayers = [
  { id: 1, name: "Erling Haaland", position: "FWD", team: "MCI", price: 140, predicted: 8.5, form: 7.2, risk: 0.2 },
  { id: 2, name: "Mohamed Salah", position: "MID", team: "LIV", price: 135, predicted: 8.2, form: 8.0, risk: 0.15 },
  { id: 3, name: "Bukayo Saka", position: "MID", team: "ARS", price: 95, predicted: 7.8, form: 7.5, risk: 0.25 },
  { id: 4, name: "Ollie Watkins", position: "FWD", team: "AVL", price: 85, predicted: 7.5, form: 8.2, risk: 0.3 },
  { id: 5, name: "Alexander Isak", position: "FWD", team: "NEW", price: 75, predicted: 7.2, form: 6.8, risk: 0.35 },
]

export default function TransfersPage() {
  const [search, setSearch] = useState("")
  const [positionFilter, setPositionFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"predicted" | "price" | "form">("predicted")
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([])

  const filteredPlayers = mockPlayers
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (positionFilter && p.position !== positionFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "predicted") return b.predicted - a.predicted
      if (sortBy === "price") return b.price - a.price
      return b.form - a.form
    })

  const togglePlayer = (id: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-ai-darker relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/stocks.mp4" type="video/mp4" />
        </video>
        {/* Overlay for better content readability */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-premier opacity-20" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl z-10">
        {/* Header */}
        <SectionHeader
          title="Transfer Market"
          subtitle="Search and compare players with AI-powered insights"
        />

        {/* Filters */}
        <GlassCard glow className="mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <Input
                  type="text"
                  placeholder="Search players..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 glass border-ai-primary/20"
                />
              </div>
            </div>
            <select
              value={positionFilter || ""}
              onChange={(e) => setPositionFilter(e.target.value || null)}
              className="glass rounded-lg px-4 py-2 text-white border border-ai-primary/20 focus:outline-none focus:ring-2 focus:ring-ai-primary"
            >
              <option value="">All Positions</option>
              <option value="GK">Goalkeeper</option>
              <option value="DEF">Defender</option>
              <option value="MID">Midfielder</option>
              <option value="FWD">Forward</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="glass rounded-lg px-4 py-2 text-white border border-ai-primary/20 focus:outline-none focus:ring-2 focus:ring-ai-primary"
            >
              <option value="predicted">Sort by Predicted</option>
              <option value="price">Sort by Price</option>
              <option value="form">Sort by Form</option>
            </select>
          </div>
        </GlassCard>

        {/* Player Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                glow
                hover
                onClick={() => togglePlayer(player.id)}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedPlayers.includes(player.id) && "ring-2 ring-ai-primary"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{player.name}</h3>
                    <p className="text-sm text-white/60">{player.position} • {player.team}</p>
                  </div>
                  <div className="px-2 py-1 rounded bg-ai-primary/20 text-ai-primary text-sm font-semibold">
                    £{player.price / 10}M
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-white/60 mb-1">Predicted</p>
                    <p className="text-lg font-bold text-white">{player.predicted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Form</p>
                    <p className="text-lg font-bold text-white">{player.form}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Risk</p>
                    <p className="text-lg font-bold text-white">{player.risk}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
