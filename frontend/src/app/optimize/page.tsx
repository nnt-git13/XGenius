"use client"

import React, { useState, useMemo } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Zap, Target, TrendingUp, Clock, Settings, CheckCircle2, 
  Loader2, LayoutGrid, LayoutList, AlertCircle, Sparkles,
  ArrowRightLeft, Trophy
} from "lucide-react"
import { api } from "@/lib/api"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { OptimizedTeamDisplay, OptimizedTeamCard } from "@/components/optimize/OptimizedTeamDisplay"
import { useAppStore } from "@/store/useAppStore"
import { cn } from "@/lib/utils"

type ViewMode = "list" | "grid"
type TransferFilter = "all" | "0" | "1" | "2" | "3+"

export default function OptimizePage() {
  const teamId = useAppStore((state) => state.teamId)
  const [optimizationType, setOptimizationType] = useState<"1gw" | "3gw" | "longterm">("1gw")
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0) // First one expanded by default
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [filterTransfers, setFilterTransfers] = useState<TransferFilter>("all")

  // Fetch current team data
  const { data: teamData, isLoading: isLoadingTeam } = useQuery({
    queryKey: ["team-evaluation", teamId],
    queryFn: () => api.evaluateTeam({ season: "2024-25", team_id: teamId ?? undefined }),
    enabled: !!teamId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  // Calculate available budget
  const availableBudget = teamData 
    ? (teamData.squad_value || 0) + (teamData.bank || 0)
    : 100.0

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const currentSquad = teamData?.players
        ?.filter((p: any) => p.fpl_id)
        .map((p: any) => p.fpl_id) || []
      
      const freeTransfers = 1
      const targetGameweek = teamData?.gameweek ? teamData.gameweek + 1 : null
      
      return await api.optimizeSquad({
        season: "2024-25",
        budget: availableBudget,
        horizon_gw: optimizationType === "1gw" ? 1 : optimizationType === "3gw" ? 3 : 5,
        current_squad: currentSquad,
        free_transfers: freeTransfers,
        target_gameweek: targetGameweek,
      })
    },
    onSuccess: (data) => {
      console.log("Optimization response:", data)
      setExpandedIndex(0)
      setSelectedCardIndex(0)
    },
    onError: (error: any) => {
      console.error("Optimization error:", error)
    },
  })

  // Filter and sort options
  const filteredOptions = useMemo(() => {
    if (!optimizeMutation.data?.options) return []
    
    let options = [...optimizeMutation.data.options]
    
    // Filter by transfer count
    if (filterTransfers !== "all") {
      if (filterTransfers === "3+") {
        options = options.filter(opt => opt.transfers_count >= 3)
      } else {
        const count = parseInt(filterTransfers)
        options = options.filter(opt => opt.transfers_count === count)
      }
    }
    
    // Sort: prioritize 1-2 transfers (not free hit), then by XG score
    options.sort((a, b) => {
      const aIsFreeHit = a.transfer_cost === 0 && a.transfers_count > 0
      const bIsFreeHit = b.transfer_cost === 0 && b.transfers_count > 0
      
      const aPriority = !aIsFreeHit && (a.transfers_count === 1 || a.transfers_count === 2) ? 1 : 0
      const bPriority = !bIsFreeHit && (b.transfers_count === 1 || b.transfers_count === 2) ? 1 : 0
      
      if (aPriority !== bPriority) return bPriority - aPriority
      return b.xg_score - a.xg_score
    })
    
    return options
  }, [optimizeMutation.data?.options, filterTransfers])

  const handleOptimize = () => {
    optimizeMutation.mutate()
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source src="/optimize.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,255,133,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1)_0%,transparent_60%)]" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl z-10">
        {/* Header */}
        <SectionHeader
          title="Squad Optimizer"
          subtitle="AI-powered squad optimization with ML predictions"
        />

        {/* No Team ID Warning */}
        {!teamId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard className="border-yellow-500/30 bg-yellow-500/10">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-200 font-medium">
                    Team ID not configured
                  </p>
                  <p className="text-xs text-yellow-300/70 mt-1">
                    Go to Settings to set your FPL Team ID for personalized optimization
                  </p>
                </div>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/settings"}
                >
                  Settings
                </AnimatedButton>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Settings Panel */}
          <div className="space-y-4">
            <GlassCard>
              <div className="flex items-center gap-2 mb-5">
                <Settings className="h-5 w-5 text-ai-primary" />
                <h3 className="text-lg font-bold text-white">Settings</h3>
              </div>

              {/* Optimization Type */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Optimization Horizon
                </label>
                <div className="space-y-2">
                  {[
                    { value: "1gw", label: "Next GW", desc: "Maximize next week", icon: Clock },
                    { value: "3gw", label: "3 Gameweeks", desc: "Short-term planning", icon: TrendingUp },
                    { value: "longterm", label: "Long Term", desc: "Season outlook", icon: Target },
                  ].map((opt) => {
                    const Icon = opt.icon
                    const isActive = optimizationType === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setOptimizationType(opt.value as any)}
                        className={cn(
                          "w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3",
                          isActive
                            ? "border-ai-primary bg-ai-primary/15"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isActive ? "text-ai-primary" : "text-white/50")} />
                        <div className="flex-1 min-w-0">
                          <div className={cn("font-medium text-sm", isActive ? "text-white" : "text-white/70")}>
                            {opt.label}
                          </div>
                          <div className="text-xs text-white/40">{opt.desc}</div>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-ai-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Budget Display */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Available Budget
                </label>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xl font-bold text-white mb-1">
                    £{availableBudget.toFixed(1)}m
                  </div>
                  {teamData && (
                    <div className="text-xs text-white/50">
                      Squad: £{teamData.squad_value?.toFixed(1) || "0.0"}m • Bank: £{teamData.bank?.toFixed(1) || "0.0"}m
                    </div>
                  )}
                </div>
              </div>

              {/* Optimize Button */}
              <AnimatedButton
                variant="primary"
                size="lg"
                glow
                onClick={handleOptimize}
                disabled={optimizeMutation.isPending || !teamId}
                className="w-full"
              >
                {optimizeMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Optimizing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Optimize Squad
                  </span>
                )}
              </AnimatedButton>
            </GlassCard>

            {/* Info Card */}
            <GlassCard className="bg-ai-primary/5 border-ai-primary/20">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-ai-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">How It Works</h4>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Our optimizer uses ML predictions to analyze player performance, 
                    fixture difficulty, and form to find the best squad configuration 
                    for your selected time horizon.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {/* Loading State */}
            {optimizeMutation.isPending && (
              <GlassCard className="min-h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="inline-block mb-4"
                  >
                    <Sparkles className="h-16 w-16 text-ai-primary" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-2">Finding Optimal Squads</h3>
                  <p className="text-white/60 text-sm">
                    Analyzing thousands of combinations...
                  </p>
                </div>
              </GlassCard>
            )}

            {/* Error State */}
            {optimizeMutation.isError && (
              <GlassCard className="min-h-[400px] flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="h-14 w-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-7 w-7 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Optimization Failed</h3>
                  <p className="text-white/60 text-sm mb-4">
                    {(optimizeMutation.error as any)?.message || "An error occurred"}
                  </p>
                  <AnimatedButton variant="outline" onClick={() => optimizeMutation.reset()}>
                    Try Again
                  </AnimatedButton>
                </div>
              </GlassCard>
            )}

            {/* Success State */}
            {optimizeMutation.isSuccess && optimizeMutation.data?.options && (
              <>
                {/* Results Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">
                        {optimizeMutation.data.options.length} options found
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex rounded-lg border border-white/10 overflow-hidden">
                      <button
                        onClick={() => setViewMode("list")}
                        className={cn(
                          "p-2 transition-colors",
                          viewMode === "list" ? "bg-white/10" : "hover:bg-white/5"
                        )}
                      >
                        <LayoutList className="h-4 w-4 text-white/70" />
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "p-2 transition-colors",
                          viewMode === "grid" ? "bg-white/10" : "hover:bg-white/5"
                        )}
                      >
                        <LayoutGrid className="h-4 w-4 text-white/70" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-white/50">Filter:</span>
                  {[
                    { value: "all", label: "All" },
                    { value: "0", label: "0 transfers" },
                    { value: "1", label: "1 transfer" },
                    { value: "2", label: "2 transfers" },
                    { value: "3+", label: "3+ transfers" },
                  ].map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilterTransfers(f.value as TransferFilter)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-all",
                        filterTransfers === f.value
                          ? "bg-ai-primary text-white"
                          : "bg-white/10 text-white/60 hover:bg-white/15"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Results */}
                {filteredOptions.length === 0 ? (
                  <GlassCard>
                    <div className="text-center py-8">
                      <p className="text-white/60">No options match this filter.</p>
                    </div>
                  </GlassCard>
                ) : viewMode === "list" ? (
                  <div className="space-y-3">
                    {filteredOptions.map((option, index) => (
                      <OptimizedTeamDisplay
                        key={index}
                        option={option}
                        index={index}
                        isExpanded={expandedIndex === index}
                        onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredOptions.map((option, index) => (
                      <OptimizedTeamCard
                        key={index}
                        option={option}
                        index={index}
                        isSelected={selectedCardIndex === index}
                        onSelect={() => setSelectedCardIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Initial State */}
            {!optimizeMutation.isPending && !optimizeMutation.isSuccess && !optimizeMutation.isError && (
              <GlassCard className="min-h-[500px] flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 rounded-full bg-ai-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Target className="h-10 w-10 text-ai-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Ready to Optimize</h3>
                  <p className="text-white/60 text-sm mb-6">
                    Configure your optimization horizon and click "Optimize Squad" 
                    to get AI-powered squad recommendations.
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5" />
                      <span>XG Score Ranking</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      <span>Transfer Analysis</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>ML Predictions</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
