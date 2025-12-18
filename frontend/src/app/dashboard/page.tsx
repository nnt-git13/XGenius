"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { TrendingUp, Users, Target, AlertTriangle, DollarSign, Zap, Activity } from "lucide-react"
import { api } from "@/lib/api"
import { StatCard } from "@/components/charts/StatCard"
import { PointsChart } from "@/components/charts/PointsChart"
import { TeamRadarChart } from "@/components/charts/RadarChart"
import { FixtureHeatmap } from "@/components/charts/FixtureHeatmap"
import { Loading } from "@/components/ui/Loading"
import { GlassCard } from "@/components/ui/GlassCard"
import { SectionHeader } from "@/components/ui/SectionHeader"

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.getDashboardStats(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    placeholderData: {
      season: "2024-25",
      gameweek: null,
      total_points: 0.0,
      expected_points: 0.0,
      risk_score: 0.5,
      fixture_difficulty: 3.0,
      squad_value: 0.0,
      bank: 100.0,
      players: [],
      captain_id: null,
      vice_captain_id: null,
    },
    // Don't treat network errors as errors if we have placeholder data
    throwOnError: false,
  })

  const displayStats = stats
    ? {
        total_points: stats.total_points || 0.0,
        expected_points: stats.expected_points || 0.0,
        risk_score: stats.risk_score || 0.0,
        squad_value: stats.squad_value || 0.0,
        bank: stats.bank || 0.0,
        fixture_difficulty: stats.fixture_difficulty || 3.0,
      }
    : {
        total_points: 0.0,
        expected_points: 0.0,
        risk_score: 0.5,
        squad_value: 0.0,
        bank: 100.0,
        fixture_difficulty: 3.0,
      }

  const pointsData = [
    { gameweek: 1, points: 65, expected: 68 },
    { gameweek: 2, points: 72, expected: 70 },
    { gameweek: 3, points: 58, expected: 65 },
    { gameweek: 4, points: 81, expected: 75 },
    { gameweek: 5, points: 69, expected: 72 },
    { gameweek: 6, points: 74, expected: 70 },
  ]

  const radarData = [
    { category: "Attack", value: 75 },
    { category: "Defense", value: 68 },
    { category: "Midfield", value: 72 },
    { category: "GK", value: 80 },
    { category: "Depth", value: 65 },
    { category: "Form", value: 78 },
  ]

  const fixtureData = [
    { gameweek: 8, difficulty: 2, opponent: "BUR", isHome: true },
    { gameweek: 9, difficulty: 4, opponent: "MCI", isHome: false },
    { gameweek: 10, difficulty: 3, opponent: "CHE", isHome: true },
    { gameweek: 11, difficulty: 2, opponent: "SHU", isHome: false },
    { gameweek: 12, difficulty: 3, opponent: "LIV", isHome: true },
  ]

  // Show loading only if we don't have placeholder data
  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-ai-darker flex items-center justify-center">
        <Loading size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  // Only show error if it's not a network error (we have placeholder data for that)
  if (error && !stats) {
    const isNetworkError = 
      error instanceof Error && (
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('Connection refused')
      )
    
    return (
      <div className="min-h-screen bg-ai-darker flex items-center justify-center px-4">
        <GlassCard className="max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            {isNetworkError ? "Backend Not Connected" : "Error Loading Dashboard"}
          </h2>
          <p className="text-white/70 mb-4">
            {isNetworkError 
              ? "Unable to connect to the backend server. Please ensure the backend is running on http://localhost:8000"
              : error instanceof Error ? error.message : "An error occurred"}
          </p>
          {isNetworkError && (
            <p className="text-sm text-white/50 mb-4">
              The dashboard is showing placeholder data. Start the backend to see real data.
            </p>
          )}
        </GlassCard>
      </div>
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
          <source src="/dashboard.mp4" type="video/mp4" />
        </video>
        {/* Overlay for better content readability */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-premier opacity-20" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Backend Connection Warning */}
        {error && (error as any)?.code === 'ERR_NETWORK' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard className="border-yellow-500/50 bg-yellow-500/10">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-200 font-medium">
                    Backend not connected - showing placeholder data
                  </p>
                  <p className="text-xs text-yellow-300/70 mt-1">
                    Start the backend server to see real dashboard data
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Header */}
        <SectionHeader
          title="Dashboard"
          subtitle={`${stats?.season || "2024-25"} • Gameweek ${stats?.gameweek || "—"}`}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Points"
            value={displayStats.total_points.toFixed(1)}
            icon={TrendingUp}
            variant="success"
            glow
            delay={0.1}
            trend={{
              value: 5.2,
              direction: "up",
            }}
          />
          <StatCard
            title="Squad Value"
            value={`£${displayStats.squad_value.toFixed(1)}M`}
            icon={DollarSign}
            variant="info"
            glow
            delay={0.2}
          />
          <StatCard
            title="Expected Points"
            value={displayStats.expected_points.toFixed(1)}
            icon={Target}
            variant="default"
            glow
            delay={0.3}
          />
          <StatCard
            title="Bank"
            value={`£${displayStats.bank.toFixed(1)}M`}
            icon={Activity}
            variant={displayStats.bank > 1 ? "success" : "warning"}
            glow
            delay={0.4}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <GlassCard glow delay={0.5}>
            <h3 className="text-xl font-bold text-white mb-4">Points Trend</h3>
            <PointsChart data={pointsData} />
          </GlassCard>

          <GlassCard glow delay={0.6}>
            <h3 className="text-xl font-bold text-white mb-4">Team Radar</h3>
            <TeamRadarChart data={radarData} />
          </GlassCard>
        </div>

        {/* Fixture Heatmap */}
        <GlassCard glow delay={0.7}>
          <FixtureHeatmap fixtures={fixtureData} />
        </GlassCard>
      </div>
    </div>
  )
}
