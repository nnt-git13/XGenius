"use client"

import React, { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, Sparkles, ArrowRightLeft } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { PlayerDetail } from "@/types/team"
import { useWishlistStore } from "@/store/useWishlistStore"

type Props = {
  isOpen: boolean
  onClose: () => void
  outPlayer: PlayerDetail | null
  /** Optional: show a pinned "revert" option to bring this player back. */
  revertPlayer?: PlayerDetail | null
  squadPlayers: PlayerDetail[]
  bank: number // £m
  onSelectInPlayer: (p: PlayerDetail) => void
}

function _safeNum(x: any): number {
  const n = typeof x === "string" ? parseFloat(x) : Number(x)
  return Number.isFinite(n) ? n : 0
}

function _posToElementType(pos: PlayerDetail["position"]): number {
  // FPL: 1=GK 2=DEF 3=MID 4=FWD
  return pos === "GK" ? 1 : pos === "DEF" ? 2 : pos === "MID" ? 3 : 4
}

export function TransferSuggestionsModal({
  isOpen,
  onClose,
  outPlayer,
  revertPlayer = null,
  squadPlayers,
  bank,
  onSelectInPlayer,
}: Props) {
  const [q, setQ] = useState("")
  const wishlistItems = useWishlistStore((s) => s.items)

  const taken = useMemo(() => new Set(squadPlayers.map((p) => p.id)), [squadPlayers])
  const maxBudget = useMemo(() => {
    if (!outPlayer) return 0
    return Math.max(0, _safeNum(bank) + _safeNum(outPlayer.price))
  }, [bank, outPlayer])

  const { data, isLoading, error } = useQuery({
    queryKey: ["fpl-bootstrap-static"],
    queryFn: () => api.getFplBootstrapStatic(),
    enabled: isOpen,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const candidates = useMemo(() => {
    if (!outPlayer || !data?.elements || !data?.teams) return []

    const elementType = _posToElementType(outPlayer.position)
    const ql = q.trim().toLowerCase()
    const wishedSet = new Set(
      wishlistItems.filter((x) => x.position === outPlayer.position).map((x) => x.id),
    )

    const teamsById = new Map<number, any>((data.teams || []).map((t: any) => [t.id, t]))

    const mapped: Array<PlayerDetail & { ai_score: number; ep_next: number; ppg: number; form: number }> = []

    for (const el of data.elements as any[]) {
      if (!el?.id) continue
      if (taken.has(Number(el.id))) continue
      if (Number(el.element_type) !== elementType) continue

      const price = _safeNum(el.now_cost) / 10
      if (price > maxBudget) continue

      const name = String(el.web_name || "").trim()
      const first = String(el.first_name || "").trim()
      const second = String(el.second_name || "").trim()
      const full = `${first} ${second}`.trim()
      const team = teamsById.get(Number(el.team))

      if (ql) {
        const hay = `${name} ${full} ${team?.name || ""} ${team?.short_name || ""}`.toLowerCase()
        if (!hay.includes(ql)) continue
      }

      const ep_next = _safeNum(el.ep_next)
      const ppg = _safeNum(el.points_per_game)
      const form = _safeNum(el.form)
      const ict = _safeNum(el.ict_index)
      const sel = _safeNum(el.selected_by_percent)

      // Lightweight “AI score” heuristic from FPL signals (fast + local):
      // - ep_next: forward-looking expected points
      // - form/ppg/ict: current performance signals
      // - selected_by_percent: mild “wisdom of crowd” prior
      const ai_score = ep_next * 1.6 + form * 0.8 + ppg * 0.4 + ict * 0.08 + sel * 0.02

      mapped.push({
        id: Number(el.id),
        fpl_id: Number(el.id),
        db_id: null,
        fpl_code: el.code != null ? Number(el.code) : null,
        name: name || full || `Player ${el.id}`,
        position: outPlayer.position,
        team: String(team?.name || "Unknown"),
        team_short_name: team?.short_name ? String(team.short_name) : undefined,
        team_fpl_code: team?.code != null ? Number(team.code) : null,
        price,
        status: (el.status as any) || "a",
        is_starting: outPlayer.is_starting,
        is_captain: false,
        is_vice_captain: false,
        multiplier: outPlayer.multiplier,
        gw_points_raw: 0,
        gw_points: 0,
        total_points: _safeNum(el.total_points),
        goals_scored: Number(el.goals_scored || 0),
        assists: Number(el.assists || 0),
        clean_sheets: Number(el.clean_sheets || 0),
        yellow_cards: Number(el.yellow_cards || 0),
        red_cards: Number(el.red_cards || 0),
        ai_score,
        ep_next,
        ppg,
        form,
      })
    }

    // Pin wishlisted players (same position) to the top, then rank by AI score.
    mapped.sort((a, b) => {
      const aw = wishedSet.has(a.id) ? 1 : 0
      const bw = wishedSet.has(b.id) ? 1 : 0
      if (aw !== bw) return bw - aw
      return b.ai_score - a.ai_score
    })
    return mapped.slice(0, 40)
  }, [data, outPlayer, taken, maxBudget, q, wishlistItems])

  const canRevert = useMemo(() => {
    if (!outPlayer || !revertPlayer) return false
    // Only show if the revert player is affordable with this slot's budget.
    return Number(revertPlayer.price) <= maxBudget
  }, [outPlayer, revertPlayer, maxBudget])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={outPlayer ? `Transfer suggestions · ${outPlayer.position}` : "Transfer suggestions"}
      // Keep this modal compact (similar footprint to the right-side player details panel)
      size="sm"
      placement="right"
      // Nudge it so it visually sits over the right-side player details panel area.
      // Anchor to the same max-width container as the page so it doesn't hug the viewport edge.
      containerClassName="max-w-6xl mx-auto w-full"
      className="bg-[#0b1220] h-[560px] max-h-[75vh] overflow-hidden"
      // Modal content wrapper is scrollable; we manage internal scroll for the list
      contentClassName="overflow-hidden"
    >
      {!outPlayer ? (
        <div className="text-white/70">Select a player first.</div>
      ) : (
        <div className="flex flex-col gap-4 h-full">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-white/60 text-xs font-semibold">Transfer out</div>
              <div className="text-white text-lg font-semibold truncate">{outPlayer.name}</div>
              <div className="text-white/60 text-sm">
                Budget: <span className="text-white/85 font-semibold">£{maxBudget.toFixed(1)}m</span>{" "}
                <span className="text-white/40">(includes £{bank.toFixed(1)}m in bank)</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <Sparkles className="h-4 w-4 text-ai-secondary" />
              <div className="text-xs text-white/70">
                Ranked by <span className="text-white/90 font-semibold">AI score</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search player or team…"
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-ai-primary/40"
            />
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading && <div className="text-white/70">Loading suggestions…</div>}
            {error && (
              <div className="text-red-300 text-sm">
                Failed to load suggestions: {(error as any)?.message || "Unknown error"}
              </div>
            )}

            {!isLoading && !error && (
              <div className="grid gap-3">
                {canRevert && revertPlayer && (
                  <button
                    type="button"
                    onClick={() => onSelectInPlayer(revertPlayer)}
                    className={cn(
                      "text-left rounded-2xl border p-4 transition-colors",
                      "bg-ai-primary/10 border-ai-primary/25 hover:bg-ai-primary/15 hover:border-ai-primary/40",
                      "xg-focus-ring"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-ai-primary text-xs font-bold">Revert transfer</div>
                        <div className="text-white font-semibold truncate">{revertPlayer.name}</div>
                        <div className="text-white/60 text-xs truncate">
                          {revertPlayer.team_short_name || revertPlayer.team} • £{revertPlayer.price.toFixed(1)}m
                        </div>
                      </div>
                      <div className="shrink-0 rounded-xl bg-black/25 border border-white/10 px-3 py-2">
                        <div className="text-[10px] text-white/60 font-semibold">Original</div>
                        <div className="text-xs text-white/90 font-bold">Swap back</div>
                      </div>
                    </div>
                  </button>
                )}
              {candidates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectInPlayer(p)}
                  className={cn(
                    "text-left rounded-2xl bg-white/5 border border-white/10 hover:bg-white/7 hover:border-white/20 transition-colors p-4",
                    "xg-focus-ring"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{p.name}</div>
                      <div className="text-white/60 text-xs truncate">
                        {p.team_short_name || p.team} • £{p.price.toFixed(1)}m
                      </div>
                    </div>
                    <div className="shrink-0 rounded-xl bg-ai-primary/15 border border-ai-primary/25 px-2 py-1">
                      <div className="text-[10px] text-ai-primary/90 font-bold">AI</div>
                      <div className="text-xs text-ai-primary font-semibold">{p.ai_score.toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-black/25 border border-white/10 px-2 py-2">
                      <div className="text-white/50">EP next</div>
                      <div className="text-white/90 font-semibold">{p.ep_next.toFixed(1)}</div>
                    </div>
                    <div className="rounded-xl bg-black/25 border border-white/10 px-2 py-2">
                      <div className="text-white/50">Form</div>
                      <div className="text-white/90 font-semibold">{p.form.toFixed(1)}</div>
                    </div>
                    <div className="rounded-xl bg-black/25 border border-white/10 px-2 py-2">
                      <div className="text-white/50">PPG</div>
                      <div className="text-white/90 font-semibold">{p.ppg.toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-white/60">
                    <div className={cn("px-2 py-1 rounded-lg border", p.status === "a" ? "border-green-500/20 bg-green-500/10 text-green-300" : "border-yellow-500/20 bg-yellow-500/10 text-yellow-200")}>
                      {p.status === "a" ? "Available" : "Flagged"}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <span>Swap</span>
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              ))}

              {candidates.length === 0 && (
                <div className="text-white/60 text-sm">
                  No candidates found within budget. Try a different search or player.
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      )}
    </Modal>
  )
}


