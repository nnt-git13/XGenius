"use client"

import React, { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Loading } from "@/components/ui/Loading"
import { TeamRadarChart } from "@/components/charts/RadarChart"
import { getTeamAbbreviation } from "@/utils/teamMapping"

type PlayerLite = {
  id: number
  name: string
  position: string
  team: string
  team_short: string
  price: number
  total_points: number
  points_per_game: number
  form: number
  selected_by_percent: number
  influence: number
  creativity: number
  threat: number
  ict_index: number
}

function toPctBucket(v: number, max: number) {
  const x = max > 0 ? v / max : 0
  return Math.round(Math.max(0, Math.min(1, x)) * 100)
}

function radarFor(p: PlayerLite | null) {
  if (!p) return []
  return [
    { category: "Form", value: toPctBucket(p.form || 0, 10) },
    { category: "Influence", value: toPctBucket(p.influence || 0, 100) },
    { category: "Creativity", value: toPctBucket(p.creativity || 0, 100) },
    { category: "Threat", value: toPctBucket(p.threat || 0, 100) },
    { category: "ICT", value: toPctBucket(p.ict_index || 0, 30) },
    { category: "Value", value: toPctBucket(((p.points_per_game || 0) / Math.max(1, p.price || 1)) / 2, 1) },
  ]
}

export default function ComparePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const a = searchParams.get("a")
  const b = searchParams.get("b")

  const aId = a ? Number.parseInt(a, 10) : null
  const bId = b ? Number.parseInt(b, 10) : null

  // Background image behavior (same as player full stats).
  const [baseBgHidden, setBaseBgHidden] = useState(false)
  const [bgIdx, setBgIdx] = useState(0)
  const [aImgIdx, setAImgIdx] = useState(0)
  const [bImgIdx, setBImgIdx] = useState(0)

  const { data: fplBootstrap, isLoading, error } = useQuery({
    queryKey: ["fpl-bootstrap-static"],
    queryFn: () => api.getFplBootstrapStatic(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const { players, playerA, playerB } = useMemo(() => {
    const teams = (fplBootstrap?.teams || []) as any[]
    const elements = (fplBootstrap?.elements || []) as any[]
    const teamsById: Record<number, any> = {}
    for (const t of teams) {
      if (t?.id != null) teamsById[Number(t.id)] = t
    }
    const positionMap: { [key: number]: string } = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" }

    const mk = (el: any): PlayerLite => {
      const team = teamsById[Number(el.team)]
      return {
        id: Number(el.id),
        name: `${el.first_name} ${el.second_name}`,
        position: positionMap[Number(el.element_type)] || "MID",
        team: team?.name || "Unknown",
        team_short: team?.short_name || "",
        price: Number(el.now_cost || 0) / 10,
        total_points: Number(el.total_points || 0),
        points_per_game: Number.parseFloat(el.points_per_game) || 0,
        form: Number.parseFloat(el.form) || 0,
        selected_by_percent: Number.parseFloat(el.selected_by_percent) || 0,
        influence: Number.parseFloat(el.influence) || 0,
        creativity: Number.parseFloat(el.creativity) || 0,
        threat: Number.parseFloat(el.threat) || 0,
        ict_index: Number.parseFloat(el.ict_index) || 0,
      }
    }

    const players: PlayerLite[] = elements.map(mk)
    const byId: Record<number, PlayerLite> = {}
    for (const p of players) byId[p.id] = p

    return {
      players,
      playerA: aId != null ? byId[aId] || null : null,
      playerB: bId != null ? byId[bId] || null : null,
    }
  }, [fplBootstrap, aId, bId])

  const options = useMemo(() => {
    // Keep it reasonably responsive: show only the first ~250 options in the datalist.
    return players.slice(0, 250)
  }, [players])

  const bgUrl = useMemo(() => {
    const id = playerA?.id ?? null
    const candidates = [
      id != null ? `/backgrounds/${id}.jpg` : null,
      id != null ? `/backgrounds/${id}.jpeg` : null,
      id != null ? `/backgrounds/${id}.png` : null,
      id != null ? `/backgrounds/${id}.webp` : null,
      id != null ? `/backgrounds/${id}.avif` : null,
      `/backgrounds/generic.jpg`,
      `/backgrounds/generic.jpeg`,
      `/backgrounds/generic.png`,
      `/backgrounds/generic.webp`,
      `/backgrounds/generic.avif`,
    ].filter(Boolean) as string[]
    return candidates[bgIdx] || null
  }, [playerA?.id, bgIdx])

  const playerAImg = useMemo(() => {
    const id = playerA?.id ?? null
    if (id == null) return null
    const candidates = [
      `/backgrounds/${id}.jpg`,
      `/backgrounds/${id}.jpeg`,
      `/backgrounds/${id}.png`,
      `/backgrounds/${id}.webp`,
      `/backgrounds/${id}.avif`,
    ]
    return candidates[aImgIdx] || null
  }, [playerA?.id, aImgIdx])

  const playerBImg = useMemo(() => {
    const id = playerB?.id ?? null
    if (id == null) return null
    const candidates = [
      `/backgrounds/${id}.jpg`,
      `/backgrounds/${id}.jpeg`,
      `/backgrounds/${id}.png`,
      `/backgrounds/${id}.webp`,
      `/backgrounds/${id}.avif`,
    ]
    return candidates[bImgIdx] || null
  }, [playerB?.id, bImgIdx])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loading size="lg" text="Loading compare data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-white mb-4">Unable to load compare</h1>
          <p className="text-white/70 mb-6">{String((error as any)?.message || "Unknown error")}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background (match full stats) */}
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

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        <Link href="/team?gw=latest">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Team
          </Button>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-white">Compare Players</h1>

          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-white/60 mb-1">Player B (id or pick)</label>
              <input
                list="compare-player-options"
                defaultValue={bId != null ? String(bId) : ""}
                placeholder="e.g. 3 or start typing a name…"
                className="w-[320px] max-w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none"
                onChange={(e) => {
                  const raw = e.target.value.trim()
                  // Accept direct id input, or "Name (#id)" datalist format.
                  const m = raw.match(/\(#(\d+)\)$/)
                  const id = m ? Number.parseInt(m[1], 10) : Number.parseInt(raw, 10)
                  if (Number.isFinite(id)) {
                    const params = new URLSearchParams(searchParams.toString())
                    if (aId != null) params.set("a", String(aId))
                    params.set("b", String(id))
                    router.push(`/compare?${params.toString()}`)
                  }
                }}
              />
              <datalist id="compare-player-options">
                {options.map((p) => (
                  <option key={p.id} value={`${p.name} (${p.team_short || getTeamAbbreviation(p.team)}) (#${p.id})`} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {playerA == null ? (
          <Card variant="glass">
            <p className="text-white/70">
              Open compare from a player page, or add query params like <span className="text-white font-semibold">?a=3&amp;b=1</span>.
            </p>
          </Card>
        ) : (
          <>
            {/* Side-by-side player images */}
            <Card variant="glass" className="mb-6 overflow-hidden">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                  <div className="text-xs text-white/60 font-semibold mb-2">Current player</div>
                  <div className="text-lg font-bold text-white mb-3">{playerA?.name}</div>
                  <div className="relative h-[260px] rounded-2xl bg-black/25 border border-white/10 overflow-hidden flex items-center justify-center">
                    {playerAImg ? (
                      <img
                        src={playerAImg}
                        alt={playerA?.name || "Player A"}
                        className="absolute inset-0 w-full h-full object-contain object-center"
                        onError={() => setAImgIdx((i) => i + 1)}
                      />
                    ) : (
                      <div className="text-white/50 text-sm">Select Player A</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />
                  </div>
                </div>

                <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                  <div className="text-xs text-white/60 font-semibold mb-2">Compare to</div>
                  <div className="text-lg font-bold text-white mb-3">{playerB?.name || "Select a player"}</div>
                  <div className="relative h-[260px] rounded-2xl bg-black/25 border border-white/10 overflow-hidden flex items-center justify-center">
                    {playerBImg ? (
                      <img
                        src={playerBImg}
                        alt={playerB?.name || "Player B"}
                        className="absolute inset-0 w-full h-full object-contain object-center"
                        onError={() => setBImgIdx((i) => i + 1)}
                      />
                    ) : (
                      <div className="text-white/50 text-sm">Pick Player B above</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              {[{ label: "Player A", p: playerA }, { label: "Player B", p: playerB }].map(({ label, p }) => (
                <Card key={label} variant="glass">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-white/60 font-semibold">{label}</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {p ? p.name : "Select a player"}
                    </div>
                    {p && (
                      <div className="text-sm text-white/70 mt-1">
                        {p.position} • {p.team} • £{p.price.toFixed(1)}m
                      </div>
                    )}
                  </div>
                </div>

                {p ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { k: "Total Points", v: String(p.total_points) },
                        { k: "PPG", v: p.points_per_game.toFixed(2) },
                        { k: "Form", v: p.form.toFixed(2) },
                        { k: "Owned", v: `${p.selected_by_percent.toFixed(1)}%` },
                        { k: "ICT", v: p.ict_index.toFixed(1) },
                        { k: "Threat", v: p.threat.toFixed(1) },
                      ].map((s) => (
                        <div key={s.k} className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <div className="text-xs text-white/60">{s.k}</div>
                          <div className="text-lg font-semibold text-white mt-1">{s.v}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <TeamRadarChart data={radarFor(p)} title="Attributes" />
                    </div>
                  </>
                ) : (
                  <p className="text-white/50">Pick Player B from the box above.</p>
                )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}


