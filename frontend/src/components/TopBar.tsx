import React, { useState } from 'react'
import { useSquadStore } from '../state/useSquadStore'
import { optimizeSquad } from '../lib/api'
import { seedSampleXI } from '../lib/seedTeam'   // <-- import this
import { Loader2 } from 'lucide-react'

export default function TopBar() {
  const {
    season, budget, formation,
    setBudget, setFormation, setSeason,
    locks, exclude,
    squad, bench,
    assignToSlot,              // used when optimizer returns players
    clearAll,
  } = useSquadStore()

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | undefined>()

  const runOptimize = async () => {
    setLoading(true); setMsg(undefined)
    try {
      const res = await optimizeSquad({
        season,
        budget,
        lock_players: locks,
        exclude_players: exclude,
      })

      // Accept several shapes from the backend
      const players: any[] =
        res?.best_xi?.players || res?.starting_xi || res?.players || []

      if (!Array.isArray(players) || players.length === 0) {
        setMsg('Optimizer returned no XI')
        return
      }

      // Build a quick position map from response
      const idToPlayer: Record<number, any> = {}
      ;[...players, ...(res.squad || [])].forEach((p: any) => {
        if (p?.id) idToPlayer[p.id] = p
      })
      const byPos: Record<string, any[]> = { GK: [], DEF: [], MID: [], FWD: [] }
      Object.values(idToPlayer).forEach((p: any) => {
        if (p?.position && byPos[p.position]) byPos[p.position].push(p)
      })

      // Assign to current slots in order
      const next = [...squad]
      next.forEach((slot, i) => {
        const list = byPos[slot.pos] || []
        const picked = list.shift()
        if (picked) assignToSlot(i, picked)
      })

      setMsg('Optimized!')
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || e.message || 'Optimization failed')
    } finally {
      setLoading(false)
    }
  }

  const filled = squad.filter(s => s.player).length + bench.filter(b => b.player).length
  const remaining = Math.max(0, 15 - filled)

  return (
    <div className="flex flex-wrap items-center gap-3 justify-between">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2"
          value={season}
          onChange={e => setSeason(e.target.value)}
        >
          <option>2024-25</option>
          <option>2025-26</option>
        </select>

        <select
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2"
          value={formation}
          onChange={e => setFormation(e.target.value as any)}
        >
          <option>3-4-3</option>
          <option>4-4-2</option>
          <option>4-3-3</option>
          <option>3-5-2</option>
        </select>

        <label className="flex items-center gap-2 text-sm">
          <span>Budget</span>
          <input
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 w-24"
            type="number" step="0.1" min={60} max={100}
            value={budget}
            onChange={e => setBudget(Number(e.target.value))}
          />
          <span>£m</span>
        </label>

        <div className="text-sm text-white/70">
          Remaining slots: <span className="font-medium">{remaining}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={clearAll}
          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
        >
          Clear
        </button>

        {/* Load a sample XI from backend */}
        <button
          onClick={() => seedSampleXI(season)}
          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
          title="Prefill a sample XI from the backend"
        >
          Load Sample XI
        </button>

        <button
          onClick={runOptimize}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-green-400 text-black hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 className="animate-spin" size={16} />}
          Optimize Squad
        </button>
      </div>

      {msg && <div className="w-full text-xs text-white/70">{msg}</div>}
    </div>
  )
}
