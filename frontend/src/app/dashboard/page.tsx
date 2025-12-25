"use client"

import React, { useMemo, useRef, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { TrendingUp, Target, AlertTriangle, DollarSign, Activity, BarChart3, Download, FileDown, Image as ImageIcon, Users } from "lucide-react"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/useAppStore"
import { StatCard } from "@/components/charts/StatCard"
import { PointsChart } from "@/components/charts/PointsChart"
import { TeamRadarChart } from "@/components/charts/RadarChart"
import { Loading } from "@/components/ui/Loading"
import { GlassCard } from "@/components/ui/GlassCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import toast from "react-hot-toast"

export default function DashboardPage() {
  const { teamId } = useAppStore()
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [exportAvailable, setExportAvailable] = useState(false)

  // Check if export libraries are available (client-side only)
  useEffect(() => {
    // Check if packages are available by trying to dynamically import
    Promise.all([
      import("html2canvas").catch(() => null),
      import("jspdf").catch(() => null),
    ]).then(([html2canvas, jspdf]) => {
      setExportAvailable(!!html2canvas && !!jspdf)
    })
  }, [])

  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ["dashboard-stats", teamId],
    queryFn: () => api.getDashboardStats(),
    enabled: !!teamId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  })

  // Fetch FPL bootstrap for gameweek info
  const { data: fplBootstrap, isLoading: isLoadingBootstrap } = useQuery({
    queryKey: ["fpl-bootstrap"],
    queryFn: () => api.getFplBootstrapStatic(),
    staleTime: 60000,
  })

  // Fetch team entry data if teamId is available
  const { data: teamEntry, isLoading: isLoadingEntry } = useQuery({
    queryKey: ["fpl-entry", teamId],
    queryFn: () => api.getFplEntry(teamId!),
    enabled: !!teamId,
    staleTime: 30000,
  })

  // Fetch team history for points trend
  const { data: teamHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["fpl-entry-history", teamId],
    queryFn: () => api.getFplEntryHistory(teamId!),
    enabled: !!teamId,
    staleTime: 60000,
  })


  // Get current gameweek
  const currentGameweek = useMemo(() => {
    if (!fplBootstrap?.events) return null
    return fplBootstrap.events.find((e: any) => e.is_current) || fplBootstrap.events.find((e: any) => e.is_next)
  }, [fplBootstrap])

  // Fetch current gameweek picks
  const { data: entryPicks, isLoading: isLoadingPicks } = useQuery({
    queryKey: ["fpl-entry-picks", teamId, currentGameweek?.id],
    queryFn: () => api.getFplEntryPicks(teamId!, currentGameweek!.id),
    enabled: !!teamId && !!currentGameweek?.id,
    staleTime: 30000,
  })

  // Process points data from GW 1 to current
  const pointsData = useMemo(() => {
    if (!teamHistory?.current || !currentGameweek) return []
    
    // Get all gameweeks from 1 to current
    const allGameweeks: Array<{ gameweek: number; points: number; expected: number }> = []
    const historyMap = new Map(teamHistory.current.map((gw: any) => [gw.event, gw]))
    
    // Get expected points from FPL bootstrap for each player in squad
    const expectedPointsMap = new Map<number, number>()
    if (fplBootstrap?.elements && stats?.players) {
      const elements = fplBootstrap.elements
      stats.players.forEach((player: any) => {
        if (player.fpl_id) {
          const element = elements.find((e: any) => e.id === player.fpl_id)
          if (element) {
            const currentEp = expectedPointsMap.get(currentGameweek.id) || 0
            expectedPointsMap.set(currentGameweek.id, currentEp + parseFloat(element.ep_next || 0))
          }
        }
      })
    }
    
    for (let gw = 1; gw <= currentGameweek.id; gw++) {
      const gwData = historyMap.get(gw)
      allGameweeks.push({
        gameweek: gw,
        points: gwData?.points || 0,
        expected: gw === currentGameweek.id ? (expectedPointsMap.get(gw) || 0) : (gwData?.points || 0), // Use actual for past, expected for current
      })
    }
    
    return allGameweeks
  }, [teamHistory, currentGameweek, fplBootstrap, stats])

  // Get current squad picks from FPL entry picks
  const currentSquadPicks = useMemo(() => {
    if (!entryPicks?.picks || !fplBootstrap?.elements) return []
    
    const elements = fplBootstrap.elements
    const elementTypes = fplBootstrap.element_types || []
    const teams = fplBootstrap.teams || []
    
    const typeMap = new Map(elementTypes.map((t: any) => [t.id, t.singular_name_short]))
    const teamMap = new Map(teams.map((t: any) => [t.id, t]))
    
    return entryPicks.picks
      .filter((pick: any) => pick.element) // Only active picks
      .map((pick: any) => {
        const element = elements.find((e: any) => e.id === pick.element)
        if (!element) return null
        
        const position = typeMap.get(element.element_type) || "MID"
        const team = teamMap.get(element.team)
        
        return {
          fpl_id: element.id,
          position: position === "GKP" ? "GK" : position,
          team_fpl_code: element.team,
          element: element,
        }
      })
      .filter(Boolean)
  }, [entryPicks, fplBootstrap])

  // Calculate radar data from squad with real metrics
  const radarData = useMemo(() => {
    if (!currentSquadPicks.length || !fplBootstrap?.elements) return []
    
    const players = currentSquadPicks
    const elements = fplBootstrap.elements
    const teams = fplBootstrap.teams || []
    const teamMap = new Map(teams.map((t: any) => [t.id, t]))
    
    const forwards = players.filter((p: any) => p.position === "FWD")
    const midfielders = players.filter((p: any) => p.position === "MID")
    const defenders = players.filter((p: any) => p.position === "DEF")
    const goalkeepers = players.filter((p: any) => p.position === "GK")
    
    // Calculate average form (using FPL form rating, typically 0-10)
    const avgForm = (pos: any[]) => {
      if (pos.length === 0) return 0
      let totalForm = 0
      pos.forEach((p: any) => {
        if (p.element) {
          totalForm += parseFloat(p.element.form || 0)
        }
      })
      return totalForm / pos.length
    }
    
    // Calculate average total points per player
    const avgPoints = (pos: any[]) => {
      if (pos.length === 0) return 0
      let totalPoints = 0
      pos.forEach((p: any) => {
        if (p.element) {
          totalPoints += parseFloat(p.element.total_points || 0)
        }
      })
      return totalPoints / pos.length
    }
    
    // Normalize values to 0-100 scale properly
    const normalizeValue = (value: number, maxValue: number) => {
      return Math.min(100, Math.max(0, (value / maxValue) * 100))
    }
    
    // Calculate position strengths (form + points, normalized)
    const attackStrength = forwards.length > 0 
      ? normalizeValue(avgForm(forwards) * 2 + avgPoints(forwards) / 5, 20) 
      : 0
    const defenseStrength = defenders.length > 0 
      ? normalizeValue(avgForm(defenders) * 2 + avgPoints(defenders) / 5, 20) 
      : 0
    const midfieldStrength = midfielders.length > 0 
      ? normalizeValue(avgForm(midfielders) * 2 + avgPoints(midfielders) / 5, 20) 
      : 0
    const gkStrength = goalkeepers.length > 0 
      ? normalizeValue(avgForm(goalkeepers) * 2 + avgPoints(goalkeepers) / 5, 20) 
      : 0
    
    return [
      { category: "Attack", value: Math.round(attackStrength) },
      { category: "Defense", value: Math.round(defenseStrength) },
      { category: "Midfield", value: Math.round(midfieldStrength) },
      { category: "GK", value: Math.round(gkStrength) },
      { category: "Depth", value: Math.round((players.length / 15) * 100) },
    ]
  }, [currentSquadPicks, fplBootstrap])

  // Calculate expected points for the season (sum of total_points from all players)
  const calculatedExpectedPoints = useMemo(() => {
    if (!currentSquadPicks.length) return 0
    return currentSquadPicks.reduce((sum: number, p: any) => {
      if (p.element) {
        return sum + parseFloat(p.element.total_points || 0)
      }
      return sum
    }, 0)
  }, [currentSquadPicks])

  const displayStats = {
    total_points: teamEntry?.summary_overall_points || 0,
    expected_points: calculatedExpectedPoints || stats?.expected_points || 0,
    risk_score: stats?.risk_score || 0.5,
    squad_value: (teamEntry?.last_deadline_value || 0) / 10,
    bank: (teamEntry?.last_deadline_bank || 0) / 10,
    overall_rank: teamEntry?.summary_overall_rank || null,
    gameweek_points: teamEntry?.summary_event_points || 0,
  }

  const isLoading = isLoadingStats || isLoadingBootstrap || (teamId && (isLoadingEntry || isLoadingHistory || isLoadingPicks))

  // Export functions with graceful fallback
  const handleExportPNG = async () => {
    if (!exportAvailable) {
      toast.error("Export requires html2canvas. Run: npm install html2canvas", { id: "export-png" })
      return
    }
    
    try {
      const html2canvas = (await import("html2canvas")).default
      if (!dashboardRef.current) {
        toast.error("Unable to export dashboard", { id: "export-png" })
        return
      }
      
      toast.loading("Generating PNG...", { id: "export-png" })
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
      })
      
      const link = document.createElement("a")
      link.download = `xgenius-dashboard-${new Date().toISOString().split("T")[0]}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      toast.success("Dashboard exported as PNG", { id: "export-png" })
    } catch (error) {
      console.error("Export PNG error:", error)
      toast.error("Failed to export PNG", { id: "export-png" })
    }
  }

  const handleExportPDF = async () => {
    if (!exportAvailable) {
      toast.error("Export requires html2canvas and jspdf. Run: npm install html2canvas jspdf", { id: "export-pdf" })
      return
    }
    
    try {
      const html2canvas = (await import("html2canvas")).default
      const jspdfModule = await import("jspdf")
      const jsPDF = jspdfModule.jsPDF || jspdfModule.default
      
      if (!dashboardRef.current) {
        toast.error("Unable to export dashboard", { id: "export-pdf" })
        return
      }
      
      toast.loading("Generating PDF...", { id: "export-pdf" })
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
      })
      
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      pdf.save(`xgenius-dashboard-${new Date().toISOString().split("T")[0]}.pdf`)
      toast.success("Dashboard exported as PDF", { id: "export-pdf" })
    } catch (error) {
      console.error("Export PDF error:", error)
      toast.error("Failed to export PDF", { id: "export-pdf" })
    }
  }

  // Calculate performance metrics with gameweek number
  const performanceMetrics = useMemo(() => {
    if (!teamHistory?.current || teamHistory.current.length === 0) {
      return {
        averagePoints: 0,
        bestGameweek: { points: 0, gameweek: 0 },
        consistency: 0,
      }
    }
    
    const points = teamHistory.current.map((gw: any) => ({ gameweek: gw.event, points: gw.points || 0 }))
    const avg = points.reduce((a: number, b: any) => a + b.points, 0) / points.length
    const best = points.reduce((max, gw) => gw.points > max.points ? gw : max, points[0])
    const stdDev = Math.sqrt(
      points.reduce((sum: number, gw: any) => sum + Math.pow(gw.points - avg, 2), 0) / points.length
    )
    const consistency = Math.max(0, Math.min(100, 100 - (stdDev / (avg || 1)) * 100))
    
    return {
      averagePoints: avg,
      bestGameweek: { points: best.points, gameweek: best.gameweek },
      consistency: consistency,
    }
  }, [teamHistory])

  // Calculate position analysis with detailed stats
  const positionAnalysis = useMemo(() => {
    if (!currentSquadPicks.length) {
      return { 
        forwards: { points: 0, count: 0, avgPoints: 0 },
        midfielders: { points: 0, count: 0, avgPoints: 0 },
        defenders: { points: 0, count: 0, avgPoints: 0 },
        goalkeepers: { points: 0, count: 0, avgPoints: 0 },
      }
    }
    
    const forwards = currentSquadPicks.filter((p: any) => p.position === "FWD")
    const midfielders = currentSquadPicks.filter((p: any) => p.position === "MID")
    const defenders = currentSquadPicks.filter((p: any) => p.position === "DEF")
    const goalkeepers = currentSquadPicks.filter((p: any) => p.position === "GK")
    
    const calcStats = (players: any[]) => {
      const totalPoints = players.reduce((sum, p) => {
        if (p.element) {
          return sum + (parseFloat(p.element.total_points) || 0)
        }
        return sum
      }, 0)
      return {
        points: totalPoints,
        count: players.length,
        avgPoints: players.length > 0 ? totalPoints / players.length : 0,
      }
    }
    
    return {
      forwards: calcStats(forwards),
      midfielders: calcStats(midfielders),
      defenders: calcStats(defenders),
      goalkeepers: calcStats(goalkeepers),
    }
  }, [currentSquadPicks])

  // Get chip usage
  const chipUsage = useMemo(() => {
    if (!teamHistory?.chips) return { freeHit: "Available", wildcard: "Available", tripleCaptain: "Available" }
    
    const usedChips = teamHistory.chips.map((c: any) => c.name)
    return {
      freeHit: usedChips.includes("freehit") ? "Used" : "Available",
      wildcard: usedChips.includes("wildcard") ? "Used" : "Available",
      tripleCaptain: usedChips.includes("3xc") ? "Used" : "Available",
    }
  }, [teamHistory])


  if (isLoading && !stats && !teamEntry) {
    return (
      <div className="min-h-screen bg-ai-darker flex items-center justify-center">
        <Loading size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  if (statsError && !stats && !teamEntry) {
    const isNetworkError = 
      statsError instanceof Error && (
        statsError.message?.includes('Network') ||
        statsError.message?.includes('Failed to fetch') ||
        statsError.message?.includes('Connection refused')
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
              : statsError instanceof Error ? statsError.message : "An error occurred"}
          </p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ai-darker relative overflow-hidden" ref={dashboardRef}>
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
        {statsError && (statsError as any)?.code === 'ERR_NETWORK' && (
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
                    Backend not connected - showing FPL API data only
                  </p>
                  <p className="text-xs text-yellow-300/70 mt-1">
                    Start the backend server to see enhanced analytics
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Header */}
        <SectionHeader
          title="Dashboard"
          subtitle={`${fplBootstrap?.events?.[0]?.name || "2024-25"} • Gameweek ${currentGameweek?.id || "—"}${displayStats.overall_rank ? ` • Rank #${displayStats.overall_rank.toLocaleString()}` : ""}`}
          action={
            exportAvailable ? (
              <div className="flex gap-2">
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={handleExportPNG}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Export PNG
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </AnimatedButton>
              </div>
            ) : undefined
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Points"
            value={displayStats.total_points.toFixed(0)}
            icon={TrendingUp}
            variant="success"
            glow
            delay={0.1}
            trend={displayStats.gameweek_points > 0 ? {
              value: displayStats.gameweek_points,
              direction: "up",
            } : undefined}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Points Trend</h3>
              <TrendingUp className="h-5 w-5 text-ai-primary" />
            </div>
            <PointsChart data={pointsData.length > 0 ? pointsData : [
              { gameweek: 1, points: 0, expected: 0 },
            ]} />
          </GlassCard>

          <GlassCard glow delay={0.6}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Team Strength</h3>
              <BarChart3 className="h-5 w-5 text-ai-primary" />
            </div>
            <TeamRadarChart data={radarData.length > 0 ? radarData : [
              { category: "Attack", value: 0 },
              { category: "Defense", value: 0 },
              { category: "Midfield", value: 0 },
              { category: "GK", value: 0 },
              { category: "Depth", value: 0 },
            ]} />
          </GlassCard>
        </div>

        {/* Analytics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <GlassCard glow>
            <h4 className="text-lg font-bold text-white mb-3">Performance Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Average Points</span>
                <span className="text-white font-semibold">{performanceMetrics.averagePoints.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Best Gameweek</span>
                <span className="text-white font-semibold">
                  GW{performanceMetrics.bestGameweek.gameweek}: {performanceMetrics.bestGameweek.points} pts
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Consistency</span>
                <span className="text-white font-semibold">{performanceMetrics.consistency.toFixed(0)}%</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard glow>
            <h4 className="text-lg font-bold text-white mb-3">Position Analysis</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Forwards ({positionAnalysis.forwards.count})</span>
                <span className="text-white font-semibold">
                  {positionAnalysis.forwards.points.toFixed(0)} pts ({positionAnalysis.forwards.avgPoints.toFixed(1)} avg)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Midfielders ({positionAnalysis.midfielders.count})</span>
                <span className="text-white font-semibold">
                  {positionAnalysis.midfielders.points.toFixed(0)} pts ({positionAnalysis.midfielders.avgPoints.toFixed(1)} avg)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Defenders ({positionAnalysis.defenders.count})</span>
                <span className="text-white font-semibold">
                  {positionAnalysis.defenders.points.toFixed(0)} pts ({positionAnalysis.defenders.avgPoints.toFixed(1)} avg)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Goalkeepers ({positionAnalysis.goalkeepers.count})</span>
                <span className="text-white font-semibold">
                  {positionAnalysis.goalkeepers.points.toFixed(0)} pts ({positionAnalysis.goalkeepers.avgPoints.toFixed(1)} avg)
                </span>
              </div>
            </div>
          </GlassCard>

          <GlassCard glow>
            <h4 className="text-lg font-bold text-white mb-3">Chip Usage</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Free Hit</span>
                <span className={`font-semibold ${chipUsage.freeHit === "Available" ? "text-green-400" : "text-yellow-400"}`}>
                  {chipUsage.freeHit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Wildcard</span>
                <span className={`font-semibold ${chipUsage.wildcard === "Available" ? "text-green-400" : "text-yellow-400"}`}>
                  {chipUsage.wildcard}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Triple Captain</span>
                <span className={`font-semibold ${chipUsage.tripleCaptain === "Available" ? "text-green-400" : "text-yellow-400"}`}>
                  {chipUsage.tripleCaptain}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Value Analysis */}
        {currentSquadPicks.length > 0 && (
          <GlassCard glow delay={0.7}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Value Analysis</h3>
              <DollarSign className="h-5 w-5 text-ai-primary" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {(() => {
                const players = currentSquadPicks
                const totalValue = players.reduce((sum: number, p: any) => {
                  if (p.element) {
                    return sum + (parseFloat(p.element.now_cost) || 0) / 10
                  }
                  return sum
                }, 0)
                const totalPoints = players.reduce((sum: number, p: any) => {
                  if (p.element) {
                    return sum + (parseFloat(p.element.total_points) || 0)
                  }
                  return sum
                }, 0)
                const pointsPerMillion = totalValue > 0 ? totalPoints / totalValue : 0
                
                // Find best value player
                const bestValue = players.reduce((best: any, p: any) => {
                  if (!p.element) return best
                  const cost = parseFloat(p.element.now_cost) || 0
                  const points = parseFloat(p.element.total_points) || 0
                  const value = cost > 0 ? points / (cost / 10) : 0
                  if (!best || value > best.value) {
                    return { name: p.element.web_name || "Unknown", value, points, cost: cost / 10 }
                  }
                  return best
                }, null)
                
                // Find worst value player
                const worstValue = players.reduce((worst: any, p: any) => {
                  if (!p.element) return worst
                  const cost = parseFloat(p.element.now_cost) || 0
                  const points = parseFloat(p.element.total_points) || 0
                  const value = cost > 0 ? points / (cost / 10) : 0
                  if (!worst || value < worst.value) {
                    return { name: p.element.web_name || "Unknown", value, points, cost: cost / 10 }
                  }
                  return worst
                }, null)
                
                return (
                  <>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/70 text-sm mb-1">Points per £M</p>
                      <p className="text-2xl font-bold text-white">{pointsPerMillion.toFixed(1)}</p>
                      <p className="text-white/50 text-xs mt-1">Squad average</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/70 text-sm mb-1">Best Value</p>
                      <p className="text-lg font-bold text-green-400">{bestValue?.name || "—"}</p>
                      <p className="text-white/50 text-xs mt-1">{bestValue ? `${bestValue.value.toFixed(1)} pts/£M` : ""}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/70 text-sm mb-1">Worst Value</p>
                      <p className="text-lg font-bold text-yellow-400">{worstValue?.name || "—"}</p>
                      <p className="text-white/50 text-xs mt-1">{worstValue ? `${worstValue.value.toFixed(1)} pts/£M` : ""}</p>
                    </div>
                  </>
                )
              })()}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
