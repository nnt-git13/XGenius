"use client"

import React, { useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ArrowLeft, TrendingUp, Target, Award, Calendar } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Loading } from "@/components/ui/Loading"
import { TeamRadarChart } from "@/components/charts/RadarChart"
import { PointsChart } from "@/components/charts/PointsChart"
import { StatCard } from "@/components/charts/StatCard"

export default function PlayerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = params.id as string
  const fromPage = searchParams.get('from') || 'team' // Default to 'team' if not specified

  // Background image behavior:
  // - If `public/backgrounds/{playerId}.jpg` exists, use it
  // - Else fallback to `public/backgrounds/generic.jpg`
  // - If neither exists, just use the gradient background
  //
  // IMPORTANT: hooks must not be conditional; keep these at the top-level of the component.
  const [bgIdx, setBgIdx] = useState(0)
  const [baseBgHidden, setBaseBgHidden] = useState(false)

  // Fetch player data from FPL API bootstrap-static
  const { data: playerData, isLoading, error } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      // Fetch bootstrap-static via our backend proxy (browser cannot call FPL directly due to CORS)
      const data = await api.getFplBootstrapStatic()
      
      // Try to find player by ID (could be FPL element ID or our internal ID)
      const playerIdNum = parseInt(playerId)
      let element = data.elements.find((el: any) => el.id === playerIdNum)
      
      // If not found, try searching by web_name or other identifiers
      if (!element) {
        console.warn(`Player with ID ${playerId} not found in bootstrap-static`)
        throw new Error(`Player with ID ${playerId} not found`)
      }
      
      const team = data.teams.find((t: any) => t.id === element.team)
      const positionMap: { [key: number]: string } = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' }
      
      return {
        id: element.id,
        name: `${element.first_name} ${element.second_name}`,
        web_name: element.web_name,
        position: positionMap[element.element_type] || 'MID',
        team: team?.name || 'Unknown',
        team_short: team?.short_name || '',
        price: element.now_cost / 10,
        total_points: element.total_points || 0,
        goals_scored: element.goals_scored || 0,
        assists: element.assists || 0,
        clean_sheets: element.clean_sheets || 0,
        form: parseFloat(element.form) || 0,
        points_per_game: parseFloat(element.points_per_game) || 0,
        selected_by_percent: parseFloat(element.selected_by_percent) || 0,
        influence: parseFloat(element.influence) || 0,
        creativity: parseFloat(element.creativity) || 0,
        threat: parseFloat(element.threat) || 0,
        ict_index: parseFloat(element.ict_index) || 0,
      }
    },
    enabled: !!playerId,
  })

  const radarData = useMemo(() => {
    if (!playerData) return []
    return [
      { category: "Goals", value: Math.min(100, (playerData.goals_scored / 30) * 100) },
      { category: "Assists", value: Math.min(100, (playerData.assists / 20) * 100) },
      { category: "Form", value: Math.min(100, playerData.form * 10) },
      { category: "ICT Index", value: Math.min(100, (playerData.ict_index / 20) * 100) },
      { category: "Influence", value: Math.min(100, (playerData.influence / 20) * 100) },
      { category: "Creativity", value: Math.min(100, (playerData.creativity / 20) * 100) },
    ]
  }, [playerData])

  const pointsHistory = [
    { gameweek: 1, points: 8, expected: 7.5 },
    { gameweek: 2, points: 12, expected: 10 },
    { gameweek: 3, points: 6, expected: 8 },
    { gameweek: 4, points: 15, expected: 12 },
    { gameweek: 5, points: 9, expected: 9.5 },
    { gameweek: 6, points: 11, expected: 10.5 },
  ]

  // Always return to the current/latest gameweek when navigating back to /team
  const backHref = fromPage === 'transfers' ? '/transfers' : '/team?gw=latest'
  const backLabel = fromPage === 'transfers' ? 'Back to Transfers' : 'Back to My Team'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loading size="lg" text="Loading player data..." />
      </div>
    )
  }

  if (error || (!playerData && !isLoading)) {
    const errMsg = (error as any)?.message ? String((error as any).message) : null
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-white mb-4">Unable to load player</h1>
          <p className="text-white/70 mb-6">
            {errMsg ? errMsg : `Could not load player with ID: ${playerId}`}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.back()}>Go Back</Button>
            <Button variant="outline" onClick={() => router.push('/team?gw=latest')}>
              Back to My Team
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // TypeScript safety: by here we expect playerData to be present.
  if (!playerData) return null

  const bgCandidates = [
    `/backgrounds/${playerData.id}.jpg`,
    `/backgrounds/${playerData.id}.jpeg`,
    `/backgrounds/${playerData.id}.png`,
    `/backgrounds/${playerData.id}.webp`,
    `/backgrounds/${playerData.id}.avif`,
    `/backgrounds/generic.jpg`,
    `/backgrounds/generic.jpeg`,
    `/backgrounds/generic.png`,
    `/backgrounds/generic.webp`,
    `/backgrounds/generic.avif`,
  ]
  const bgUrl = bgCandidates[bgIdx] || null

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Base texture layer (always below player photo). */}
        {!baseBgHidden && (
          <img
            src="/backgrounds/background.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-18"
            onError={() => setBaseBgHidden(true)}
          />
        )}

        {/* Background image (optional, auto-fallback) */}
        {bgUrl ? (
          <img
            src={bgUrl}
            alt=""
            // Keep the player fully visible: no cropping, slightly reduced scale.
            className="absolute inset-0 w-full h-full object-contain object-center opacity-100 scale-[0.84]"
            onError={() => setBgIdx((i) => i + 1)}
          />
        ) : null}
        {/* Edge fade for non-cover images (prevents harsh letterbox edges) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.75)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/45" />
        {/* Darken for readability (kept lighter since the player photo is now fully opaque) */}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-premier opacity-10" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Link href={backHref}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-fpl-green to-fpl-green-dark flex items-center justify-center text-4xl font-bold text-black">
              {playerData.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <h1 className="text-5xl font-bold gradient-text-premier mb-2">{playerData.name}</h1>
              <div className="flex items-center gap-4 text-white/70">
                <span>{playerData.position}</span>
                <span>•</span>
                <span>{playerData.team}</span>
                <span>•</span>
                <span className="text-fpl-green font-semibold">£{playerData.price.toFixed(1)}M</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Points"
            value={playerData.total_points}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Points per Game"
            value={playerData.points_per_game.toFixed(1)}
            icon={Target}
          />
          <StatCard
            title="Goals"
            value={playerData.goals_scored}
            icon={Award}
            variant="success"
          />
          <StatCard
            title="Assists"
            value={playerData.assists}
            icon={Award}
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card variant="glass">
            <h3 className="text-xl font-bold text-white mb-4">Points History</h3>
            <PointsChart data={pointsHistory} />
          </Card>
          <Card variant="glass">
            <h3 className="text-xl font-bold text-white mb-4">Player Attributes</h3>
            <TeamRadarChart data={radarData} />
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card variant="glass">
            <h3 className="text-xl font-bold text-white mb-4">Advanced Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Form</span>
                <span className="text-white font-semibold">{playerData.form}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Points per Game</span>
                <span className="text-white font-semibold">{playerData.points_per_game.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Selected By</span>
                <span className="text-white font-semibold">{playerData.selected_by_percent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">ICT Index</span>
                <span className="text-white font-semibold">{playerData.ict_index.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Clean Sheets</span>
                <span className="text-white font-semibold">{playerData.clean_sheets}</span>
              </div>
            </div>
          </Card>

          <Card variant="glass">
            <h3 className="text-xl font-bold text-white mb-4">Actions</h3>
            <div className="space-y-3">
              <Button variant="primary" className="w-full">
                Add to Watchlist
              </Button>
              <Button variant="outline" className="w-full">
                Compare with Other Players
              </Button>
              <Button variant="outline" className="w-full">
                View Fixture Difficulty
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}





