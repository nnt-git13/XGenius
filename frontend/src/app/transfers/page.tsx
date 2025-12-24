"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Search, Filter, TrendingUp, DollarSign, Target, Loader2, Info } from "lucide-react"
import { GlassCard } from "@/components/ui/GlassCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { Input } from "@/components/ui/Input"
import { api } from "@/lib/api"
import { Loading } from "@/components/ui/Loading"
import { cn } from "@/lib/utils"
import { TransferPlayerCard, TransferPlayer } from "@/components/transfers/TransferPlayerCard"
import { useTransferStore } from "@/store/useTransferStore"
import { useAppStore } from "@/store/useAppStore"
import toast from "react-hot-toast"

export default function TransfersPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [positionFilter, setPositionFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"points" | "price" | "form" | "ep">("points")
  
  const setPendingTransferIn = useTransferStore((s) => s.setPendingTransferIn)
  const teamId = useAppStore((s) => s.teamId)

  // Fetch FPL bootstrap data for players
  const { data: fplData, isLoading: loadingFpl } = useQuery({
    queryKey: ["fpl-bootstrap-static"],
    queryFn: () => api.getFplBootstrapStatic(),
    staleTime: 60_000,
  })

  // Fetch team data to get budget
  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ["my-team-for-transfers", teamId],
    queryFn: () => api.evaluateTeam({ season: "2024-25", team_id: teamId || undefined }),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = loadingFpl || loadingTeam

  // Calculate available budget
  const availableBudget = useMemo(() => {
    if (!teamData) return 100.0 // Default max budget
    return (teamData.bank || 0) + (teamData.squad_value || 100)
  }, [teamData])

  // Parse and transform players from FPL data
  const players = useMemo(() => {
    if (!fplData?.elements || !fplData?.teams) return []

    const teamsById = new Map<number, any>((fplData.teams || []).map((t: any) => [t.id, t]))
    const positionMap: Record<number, "GK" | "DEF" | "MID" | "FWD"> = {
      1: "GK", 2: "DEF", 3: "MID", 4: "FWD"
    }

    return (fplData.elements as any[])
      .filter((el: any) => el?.id)
      .map((el: any): TransferPlayer => {
        const team = teamsById.get(Number(el.team))
        return {
          id: Number(el.id),
          fpl_id: Number(el.id),
          name: el.web_name || `${el.first_name} ${el.second_name}`,
          position: positionMap[el.element_type] || "MID",
          team: team?.name || "Unknown",
          team_short_name: team?.short_name,
          price: (el.now_cost || 50) / 10,
          total_points: el.total_points || 0,
          goals_scored: el.goals_scored || 0,
          assists: el.assists || 0,
          clean_sheets: el.clean_sheets || 0,
          form: parseFloat(el.form) || 0,
          ep_next: parseFloat(el.ep_next) || 0,
          ppg: parseFloat(el.points_per_game) || 0,
          status: el.status || "a",
          selected_by_percent: parseFloat(el.selected_by_percent) || 0,
        }
      })
  }, [fplData])

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
        if (positionFilter && p.position !== positionFilter) return false
        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "points": return b.total_points - a.total_points
          case "price": return b.price - a.price
          case "form": return (b.form || 0) - (a.form || 0)
          case "ep": return (b.ep_next || 0) - (a.ep_next || 0)
          default: return 0
        }
      })
      .slice(0, 100) // Limit for performance
  }, [players, search, positionFilter, sortBy])

  // Handle transfer in - navigate to My Team
  const handleTransferIn = (player: TransferPlayer) => {
    setPendingTransferIn({
      id: player.id,
      fpl_id: player.fpl_id || player.id,
      name: player.name,
      position: player.position,
      team: player.team,
      team_short_name: player.team_short_name,
      price: player.price,
      total_points: player.total_points,
      goals_scored: player.goals_scored,
      assists: player.assists,
      form: player.form,
      ep_next: player.ep_next,
    })
    
    toast.success(`Selected ${player.name} for transfer. Choose who to replace on your team.`)
    router.push("/team?gw=upcoming&mode=transfer")
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
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-premier opacity-20" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl z-10">
        {/* Header */}
        <SectionHeader
          title="Transfer Market"
          subtitle="Browse players and add them to your team"
        />

        {/* Budget Info */}
        {teamId && teamData && (
          <GlassCard className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-ai-primary/20">
                  <DollarSign className="h-6 w-6 text-ai-primary" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Available Budget</h3>
                  <p className="text-white/60 text-sm">
                    Click "Transfer In" then choose who to replace on your team
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-ai-primary">
                  £{(teamData.bank || 0).toFixed(1)}m
                </div>
                <div className="text-white/60 text-sm">
                  In bank
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {!teamId && (
          <GlassCard className="mb-6 border-yellow-500/30 bg-yellow-500/10">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-yellow-400" />
              <p className="text-yellow-200 text-sm">
                Set your FPL Team ID in settings to see budget constraints and enable transfers.
              </p>
            </div>
          </GlassCard>
        )}

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
              <option value="form">Sort by Form</option>
              <option value="ep">Sort by Expected Points</option>
            </select>
          </div>
        </GlassCard>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loading size="lg" text="Loading players..." />
          </div>
        )}

        {/* Player Count */}
        {!isLoading && (
          <div className="mb-4 flex items-center justify-between">
            <span className="text-white/70 text-sm">
              Showing {filteredPlayers.length} of {players.length} players
            </span>
            <span className="text-white/50 text-xs">
              Players over budget are greyed out
            </span>
          </div>
        )}

        {/* Player Grid */}
        {!isLoading && filteredPlayers.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlayers.map((player, index) => (
              <TransferPlayerCard
                key={player.id}
                player={player}
                budget={availableBudget}
                onTransferIn={handleTransferIn}
                index={index}
              />
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
