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
import { getTeamAbbreviation } from "@/utils/teamMapping"
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart"
import { useWishlistStore } from "@/store/useWishlistStore"
import { toast } from "@/components/ui/Toast"

export default function PlayerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = params.id as string
  const fromPage = searchParams.get('from') || 'team' // Default to 'team' if not specified
  const returnToParam = searchParams.get("returnTo")
  const safeReturnTo =
    returnToParam && returnToParam.startsWith("/") ? returnToParam : null

  // Wishlist hooks must be unconditional (React rules-of-hooks).
  const wishlistHas = useWishlistStore((s) => s.has)
  const wishlistAdd = useWishlistStore((s) => s.add)
  const wishlistRemove = useWishlistStore((s) => s.remove)

  // Background image behavior:
  // - If `public/backgrounds/{playerId}.*` exists, use it (tries multiple extensions)
  // - Else fallback to `public/backgrounds/generic.*`
  // - If neither exists, just use the overlay gradients.
  //
  // IMPORTANT: hooks must not be conditional; keep these at the top-level of the component.
  const [bgIdx, setBgIdx] = useState(0)
  const [baseBgHidden, setBaseBgHidden] = useState(false)

  // Fetch bootstrap-static via our backend proxy (browser cannot call FPL directly due to CORS)
  const {
    data: fplBootstrap,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["fpl-bootstrap-static"],
    queryFn: () => api.getFplBootstrapStatic(),
    enabled: !!playerId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const { playerData, currentGw, teamsById } = useMemo(() => {
    const events = (fplBootstrap?.events || []) as any[]
    const teams = (fplBootstrap?.teams || []) as any[]
    const elements = (fplBootstrap?.elements || []) as any[]

    const teamsById: Record<number, any> = {}
    for (const t of teams) {
      if (t?.id != null) teamsById[Number(t.id)] = t
    }

    const current = events.find((e) => e?.is_current)?.id
    const next = events.find((e) => e?.is_next)?.id
    const currentGw =
      current != null ? Number(current) : next != null ? Math.max(1, Number(next) - 1) : null

    const playerIdNum = Number.parseInt(String(playerId), 10)
    const element = Number.isFinite(playerIdNum) ? elements.find((el) => el?.id === playerIdNum) : null
    if (!element) return { playerData: null as any, currentGw, teamsById }

    const team = teamsById[Number(element.team)]
    const positionMap: { [key: number]: string } = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" }

    return {
      playerData: {
        id: element.id,
        name: `${element.first_name} ${element.second_name}`,
        web_name: element.web_name,
        position: positionMap[element.element_type] || "MID",
        team: team?.name || "Unknown",
        team_short: team?.short_name || "",
        price: element.now_cost / 10,
        total_points: element.total_points || 0,
        goals_scored: element.goals_scored || 0,
        assists: element.assists || 0,
        clean_sheets: element.clean_sheets || 0,
        form: Number.parseFloat(element.form) || 0,
        points_per_game: Number.parseFloat(element.points_per_game) || 0,
        selected_by_percent: Number.parseFloat(element.selected_by_percent) || 0,
        influence: Number.parseFloat(element.influence) || 0,
        creativity: Number.parseFloat(element.creativity) || 0,
        threat: Number.parseFloat(element.threat) || 0,
        ict_index: Number.parseFloat(element.ict_index) || 0,
      },
      currentGw,
      teamsById,
    }
  }, [fplBootstrap, playerId])

  // element-summary: history + fixtures
  const { data: elementSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["fpl-element-summary", playerData?.id],
    queryFn: () => api.getFplElementSummary(Number(playerData?.id)),
    enabled: !!playerData?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const radarData = useMemo(() => {
    if (!playerData) return []

    // Re-aggregated attributes into more "decision" oriented buckets.
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
    const toPct = (x: number) => Math.round(clamp01(x) * 100)

    const formScore = toPct((playerData.form || 0) / 10) // form is typically 0..10
    const influenceScore = toPct((playerData.influence || 0) / 100) // cap
    const creativityScore = toPct((playerData.creativity || 0) / 100)
    const threatScore = toPct((playerData.threat || 0) / 100)
    const ictScore = toPct((playerData.ict_index || 0) / 30)
    const valueScore = toPct(((playerData.points_per_game || 0) / Math.max(1, playerData.price || 1)) / 2)

    return [
      { category: "Form", value: formScore },
      { category: "Influence", value: influenceScore },
      { category: "Creativity", value: creativityScore },
      { category: "Threat", value: threatScore },
      { category: "ICT", value: ictScore },
      { category: "Value", value: valueScore },
    ]
  }, [playerData])

  const pointsHistory = useMemo(() => {
    const hist = (elementSummary?.history || []) as any[]
    if (!hist.length) return []

    // Cumulative points up to the current GW.
    const maxGwFromHist = Math.max(...hist.map((h) => Number(h?.round || 0)).filter((n) => Number.isFinite(n)))
    const endGw = currentGw != null ? Math.max(currentGw, maxGwFromHist) : maxGwFromHist

    const pointsByGw: Record<number, number> = {}
    for (const h of hist) {
      const gw = Number(h?.round)
      if (!Number.isFinite(gw)) continue
      pointsByGw[gw] = Number(h?.total_points ?? h?.points ?? 0) || 0
    }

    const out: Array<{ gameweek: number; points: number }> = []
    let cum = 0
    for (let gw = 1; gw <= endGw; gw++) {
      cum += pointsByGw[gw] ?? 0
      out.push({ gameweek: gw, points: cum })
    }
    return out
  }, [elementSummary, currentGw])

  const gwPoints = useMemo(() => {
    const hist = (elementSummary?.history || []) as any[]
    if (!hist.length) return []

    const maxGwFromHist = Math.max(...hist.map((h) => Number(h?.round || 0)).filter((n) => Number.isFinite(n)))
    const endGw = currentGw != null ? Math.max(currentGw, maxGwFromHist) : maxGwFromHist

    const pointsByGw: Record<number, number> = {}
    for (const h of hist) {
      const gw = Number(h?.round)
      if (!Number.isFinite(gw)) continue
      pointsByGw[gw] = Number(h?.total_points ?? h?.points ?? 0) || 0
    }

    const out: Array<{ gameweek: number; points: number }> = []
    for (let gw = 1; gw <= endGw; gw++) out.push({ gameweek: gw, points: pointsByGw[gw] ?? 0 })
    return out
  }, [elementSummary, currentGw])

  const gwMinutes = useMemo(() => {
    const hist = (elementSummary?.history || []) as any[]
    if (!hist.length) return []

    const maxGwFromHist = Math.max(...hist.map((h) => Number(h?.round || 0)).filter((n) => Number.isFinite(n)))
    const endGw = currentGw != null ? Math.max(currentGw, maxGwFromHist) : maxGwFromHist

    const minutesByGw: Record<number, number> = {}
    for (const h of hist) {
      const gw = Number(h?.round)
      if (!Number.isFinite(gw)) continue
      minutesByGw[gw] = Number(h?.minutes ?? 0) || 0
    }

    const out: Array<{ gameweek: number; minutes: number }> = []
    for (let gw = 1; gw <= endGw; gw++) out.push({ gameweek: gw, minutes: minutesByGw[gw] ?? 0 })
    return out
  }, [elementSummary, currentGw])

  const gwXgi = useMemo(() => {
    const hist = (elementSummary?.history || []) as any[]
    if (!hist.length) return []

    const maxGwFromHist = Math.max(...hist.map((h) => Number(h?.round || 0)).filter((n) => Number.isFinite(n)))
    const endGw = currentGw != null ? Math.max(currentGw, maxGwFromHist) : maxGwFromHist

    const xgiByGw: Record<number, number> = {}
    for (const h of hist) {
      const gw = Number(h?.round)
      if (!Number.isFinite(gw)) continue
      const v =
        (Number(h?.expected_goal_involvements) || 0) ||
        ((Number(h?.expected_goals) || 0) + (Number(h?.expected_assists) || 0))
      xgiByGw[gw] = v
    }

    const out: Array<{ gameweek: number; xgi: number }> = []
    for (let gw = 1; gw <= endGw; gw++) out.push({ gameweek: gw, xgi: xgiByGw[gw] ?? 0 })
    return out
  }, [elementSummary, currentGw])

  const upcomingFixtures = useMemo(() => {
    const fixtures = (elementSummary?.fixtures || []) as any[]
    if (!fixtures.length) return []
    return fixtures.slice(0, 5).map((fx) => {
      const oppId = Number(fx?.opponent_team)
      const opp = teamsById?.[oppId]
      const oppShort = opp?.short_name || String(oppId || "")
      return {
        event: fx?.event != null ? Number(fx.event) : null,
        isHome: Boolean(fx?.is_home),
        difficulty: Number(fx?.difficulty ?? 0),
        opponent: oppShort,
      }
    })
  }, [elementSummary, teamsById])

  // Always return to the current/latest gameweek when navigating back to /team
  const backHref = safeReturnTo ?? (fromPage === 'transfers' ? '/transfers' : '/team?gw=latest')
  const backLabel = safeReturnTo ? "Back" : (fromPage === 'transfers' ? 'Back to Transfers' : 'Back to My Team')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {!baseBgHidden && (
            <img
              src="/backgrounds/background.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-18"
              onError={() => setBaseBgHidden(true)}
            />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.75)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/45" />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-gradient-premier opacity-10" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative min-h-screen flex items-center justify-center"
        >
          <Loading size="lg" text="Loading player data..." />
        </motion.div>
      </div>
    )
  }

  if (error || (!playerData && !isLoading)) {
    const errMsg = (error as any)?.message ? String((error as any).message) : null
    return (
      <div className="min-h-screen bg-black">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {!baseBgHidden && (
            <img
              src="/backgrounds/background.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-18"
              onError={() => setBaseBgHidden(true)}
            />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.75)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/45" />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-gradient-premier opacity-10" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative min-h-screen flex items-center justify-center"
        >
          <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-white mb-4">Unable to load player</h1>
          <p className="text-white/70 mb-6">
            {errMsg ? errMsg : `Could not load player with ID: ${playerId}`}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.back()}>Go Back</Button>
            <Button variant="outline" onClick={() => router.push(backHref)}>
              {backLabel}
            </Button>
          </div>
        </div>
        </motion.div>
      </div>
    )
  }

  // TypeScript safety: by here we expect playerData to be present.
  if (!playerData) return null
  const isWishlisted = wishlistHas(playerData.id)

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

        {/* Player cutout background (optional, auto-fallback) */}
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
            <div className="w-24 h-24 rounded-full bg-black/35 border border-white/15 shadow-xg-card flex items-center justify-center">
              <span className="text-4xl font-bold gradient-text-premier">
                {playerData.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-5xl font-bold gradient-text-premier">{playerData.name}</h1>
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/85 text-sm font-semibold">
                  {playerData.team_short || getTeamAbbreviation(playerData.team)}
                </span>
              </div>
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

        {/* Graphs (4 equal cards) */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <Card variant="glass" className="min-h-[330px]">
            <h3 className="text-lg font-bold text-white mb-3">
              {currentGw != null ? `Cumulative Points (to GW ${currentGw})` : "Cumulative Points"}
            </h3>
            <PointsChart data={pointsHistory} embedded />
            {isLoadingSummary && <p className="text-xs text-white/50 mt-2">Loading…</p>}
          </Card>

          <Card variant="glass" className="min-h-[330px]">
            <h3 className="text-lg font-bold text-white mb-3">GW Points</h3>
            <TimeSeriesChart data={gwPoints} yKey="points" kind="bar" color="#00ff85" />
          </Card>

          <Card variant="glass" className="min-h-[330px]">
            <h3 className="text-lg font-bold text-white mb-3">Minutes</h3>
            <TimeSeriesChart data={gwMinutes} yKey="minutes" kind="bar" color="#00ff85" />
          </Card>

          <Card variant="glass" className="min-h-[330px]">
            <h3 className="text-lg font-bold text-white mb-3">xGI</h3>
            <TimeSeriesChart data={gwXgi} yKey="xgi" kind="area" color="#00ff85" />
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
              <Button
                variant={isWishlisted ? "outline" : "primary"}
                className="w-full"
                onClick={() => {
                  if (wishlistHas(playerData.id)) {
                    wishlistRemove(playerData.id)
                    toast.success("Removed from watchlist")
                  } else {
                    wishlistAdd({ id: playerData.id, position: playerData.position as any })
                    toast.success("Added to watchlist")
                  }
                }}
              >
                {isWishlisted ? "Remove from Watchlist" : "Add to Watchlist"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/compare?a=${playerData.id}`)}
              >
                Compare with Other Players
              </Button>
            </div>
          </Card>
        </div>

        {/* Upcoming Fixtures */}
        <div className="mt-6">
          <Card variant="glass">
            <h3 className="text-xl font-bold text-white mb-4">Upcoming Fixtures</h3>
            {upcomingFixtures.length === 0 ? (
              <p className="text-white/50">No upcoming fixtures available.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {upcomingFixtures.map((fx, idx) => (
                  <div key={`${fx.event ?? "na"}-${idx}`} className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-xs font-semibold">
                        {fx.event != null ? `GW ${fx.event}` : "Upcoming"}
                      </span>
                      <span className="text-white/60 text-xs">{fx.isHome ? "H" : "A"}</span>
                    </div>
                    <div className="text-white font-semibold text-base">{fx.opponent}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-white/60 text-xs">Difficulty</span>
                      <span
                        className={[
                          "text-xs font-bold px-2 py-0.5 rounded-full border",
                          fx.difficulty <= 2
                            ? "bg-green-500/15 border-green-400/25 text-green-200"
                            : fx.difficulty === 3
                              ? "bg-yellow-500/15 border-yellow-400/25 text-yellow-200"
                              : "bg-red-500/15 border-red-400/25 text-red-200",
                        ].join(" ")}
                      >
                        {fx.difficulty || "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}





