"use client"

import React, { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Search, Filter, TrendingUp, TrendingDown, Star, ArrowUpDown, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { Input } from "@/components/ui/Input"
import { api, listPlayers, type Player } from "@/lib/api"
import { Loading } from "@/components/ui/Loading"
import { cn } from "@/lib/utils"

// Mock data for testing components (fallback only)
const mockPlayers = [
  { id: 1, name: "Erling Haaland", position: "FWD", team_short_name: "MCI", price: 14.0, total_points: 85, assists: 2 },
  { id: 2, name: "Mohamed Salah", position: "MID", team_short_name: "LIV", price: 13.5, total_points: 82, assists: 5 },
]

export default function TransfersPage() {
  const [search, setSearch] = useState("")
  const [positionFilter, setPositionFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"points" | "price" | "goals">("points")
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([])

  // Fetch real players from database
  const { data: playersData, isLoading, error } = useQuery({
    queryKey: ["players", positionFilter, search],
    queryFn: async () => {
      try {
        const result = await listPlayers(positionFilter || "", {
          limit: 500, // Get more players
          search: search || undefined,
        })
        return result.players
      } catch (err) {
        console.error("Error fetching players:", err)
        // Return mock data only if API fails
        return mockPlayers as unknown as Player[]
      }
    },
    staleTime: 30000,
    placeholderData: [],
  })

  const players = playersData || []

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
        if (positionFilter && p.position !== positionFilter) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === "points") return Number((b as any).total_points ?? 0) - Number((a as any).total_points ?? 0)
        if (sortBy === "price") return Number((b as any).price ?? 0) - Number((a as any).price ?? 0)
        if (sortBy === "goals") return Number((b as any).goals_scored ?? 0) - Number((a as any).goals_scored ?? 0)
        return 0
      })
      .slice(0, 100) // Limit to 100 for performance
  }, [players, search, positionFilter, sortBy])

  const togglePlayer = (id: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  // Calculate form (points per game approximation)
  const getForm = (player: Player) => {
    // Approximate form based on total points (simplified)
    return Math.min(10, (player.total_points / 10) || 0)
  }

  // Calculate risk (inverse of form, simplified)
  const getRisk = (player: Player) => {
    const form = getForm(player)
    return Math.max(0, Math.min(1, (10 - form) / 10))
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
              className="glass rounded-lg px-4 py-2 text-white border border-ai-primary/20 focus:outline-none focus:ring-2 focus:ring-ai-primary bg-ai-light/90 backdrop-blur-sm"
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
              className="glass rounded-lg px-4 py-2 text-white border border-ai-primary/20 focus:outline-none focus:ring-2 focus:ring-ai-primary bg-ai-light/90 backdrop-blur-sm"
            >
              <option value="points">Sort by Points</option>
              <option value="price">Sort by Price</option>
              <option value="goals">Sort by Goals</option>
            </select>
          </div>
        </GlassCard>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loading size="lg" text="Loading players..." />
          </div>
        )}

        {/* Error State */}
        {error && !players.length && (
          <GlassCard className="text-center py-8">
            <p className="text-white/70">Failed to load players. Showing limited data.</p>
          </GlassCard>
        )}

        {/* Player Count */}
        {!isLoading && (
          <div className="mb-4 text-white/70 text-sm">
            Showing {filteredPlayers.length} of {players.length} players
          </div>
        )}

        {/* Player Grid */}
        {!isLoading && filteredPlayers.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.5) }}
              >
                <GlassCard
                  glow
                  hover
                  onClick={() => togglePlayer(player.id)}
                  className={cn(
                    "cursor-pointer transition-all relative group",
                    selectedPlayers.includes(player.id) && "ring-2 ring-ai-primary ring-offset-2 ring-offset-ai-darker"
                  )}
                >
                  {/* Hover overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-ai-primary/0 to-ai-primary/0 group-hover:from-ai-primary/10 group-hover:to-ai-secondary/5 rounded-2xl transition-all duration-300 pointer-events-none" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-ai-primary transition-colors">
                          {player.name}
                        </h3>
                        <p className="text-sm text-white/60">
                          {player.position} • {player.team_short_name || player.team_name || "N/A"}
                        </p>
                      </div>
                      <div className="px-2 py-1 rounded bg-ai-primary/20 text-ai-primary text-sm font-semibold group-hover:bg-ai-primary/30 transition-colors">
                        £{player.price.toFixed(1)}M
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-white/60 mb-1">Points</p>
                        <p className="text-lg font-bold text-white">{player.total_points}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 mb-1">Goals</p>
                        <p className="text-lg font-bold text-white">{player.goals_scored}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 mb-1">Assists</p>
                        <p className="text-lg font-bold text-white">{player.assists}</p>
                      </div>
                    </div>
                    {player.status !== "a" && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-yellow-400">
                          Status: {player.status === "i" ? "Injured" : player.status === "s" ? "Suspended" : "Unavailable"}
                        </p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredPlayers.length === 0 && (
          <GlassCard className="text-center py-12">
            <p className="text-white/70">No players found matching your criteria.</p>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
