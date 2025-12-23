"use client"

import React, { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Eye, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useWishlistStore, type WishlistPos } from "@/store/useWishlistStore"

type WatchPlayer = {
  id: number
  web_name: string
  team: string
  team_short: string
  price: number
  points_per_game: number
  form: number
  total_points: number
  position: WishlistPos
  addedAt: number
}

const POS_ORDER: WishlistPos[] = ["GK", "DEF", "MID", "FWD"]

export function WatchlistPanel({ className }: { className?: string }) {
  const router = useRouter()
  const items = useWishlistStore((s) => s.items)
  const remove = useWishlistStore((s) => s.remove)

  const { data } = useQuery({
    queryKey: ["fpl-bootstrap-static-lite"],
    queryFn: () => api.getFplBootstrapStatic(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const players = useMemo(() => {
    const elements = (data?.elements || []) as any[]
    const teams = (data?.teams || []) as any[]

    const teamsById: Record<number, any> = {}
    for (const t of teams) {
      if (t?.id != null) teamsById[Number(t.id)] = t
    }

    const byId: Record<number, any> = {}
    for (const el of elements) {
      if (el?.id != null) byId[Number(el.id)] = el
    }

    const out: WatchPlayer[] = []
    for (const it of items) {
      const el = byId[it.id]
      if (!el) continue
      const team = teamsById[Number(el.team)]
      out.push({
        id: Number(el.id),
        web_name: String(el.web_name || `${el.first_name || ""} ${el.second_name || ""}` || `#${el.id}`).trim(),
        team: String(team?.name || "Unknown"),
        team_short: String(team?.short_name || ""),
        price: Number(el.now_cost || 0) / 10,
        points_per_game: Number.parseFloat(el.points_per_game) || 0,
        form: Number.parseFloat(el.form) || 0,
        total_points: Number(el.total_points || 0),
        position: it.position,
        addedAt: it.addedAt,
      })
    }

    // Sort by position order, then newest first.
    out.sort((a, b) => {
      const ap = POS_ORDER.indexOf(a.position)
      const bp = POS_ORDER.indexOf(b.position)
      if (ap !== bp) return ap - bp
      return b.addedAt - a.addedAt
    })
    return out
  }, [data, items])

  const grouped = useMemo(() => {
    const g: Record<WishlistPos, WatchPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] }
    for (const p of players) g[p.position].push(p)
    return g
  }, [players])

  return (
    <div className={cn("glass xg-noise rounded-2xl border border-white/10 shadow-xg-card overflow-hidden", className)}>
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Eye className="h-4 w-4 text-white/80" />
          </div>
          <div>
            <div className="text-white font-semibold leading-tight">Watchlist</div>
            <div className="text-white/55 text-xs">Pinned transfer targets (by position)</div>
          </div>
        </div>
        <div className="text-xs text-white/60">
          {items.length ? <span>{items.length} saved</span> : <span>Empty</span>}
        </div>
      </div>

      <div className="p-4">
        {!items.length ? (
          <div className="text-white/60 text-sm">
            Add players from the “Full Stats” page and they’ll appear here (and be pinned in transfer suggestions).
          </div>
        ) : (
          <div className="grid gap-4">
            {POS_ORDER.map((pos) => {
              const list = grouped[pos]
              if (!list.length) return null
              return (
                <div key={pos}>
                  <div className="text-white/60 text-xs font-semibold mb-2">{pos}</div>
                  <div className="grid gap-2">
                    {list.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          className="min-w-0 text-left xg-focus-ring"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
                              try {
                                sessionStorage.setItem(`xg:scroll:${returnTo}`, String(window.scrollY || 0))
                              } catch {}
                              router.push(`/player/${p.id}?from=team&returnTo=${encodeURIComponent(returnTo)}`)
                            }
                          }}
                        >
                          <div className="text-white font-semibold truncate">{p.web_name}</div>
                          <div className="text-white/60 text-xs truncate">
                            {p.team_short || p.team} • £{p.price.toFixed(1)}m • PPG {p.points_per_game.toFixed(1)}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => remove(p.id)}
                          className="shrink-0 h-9 w-9 rounded-xl bg-black/25 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center xg-focus-ring"
                          aria-label="Remove from watchlist"
                        >
                          <X className="h-4 w-4 text-white/70" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


