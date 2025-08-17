import React, { useMemo } from 'react'
import { useSquadStore } from '../state/useSquadStore'

export default function TopBar() {
  const {
    season, setSeason,
    formation, setFormation,
    budget, setBudget,
    squad, clearSquad, loadSampleXI, runOptimize, refreshSummary,
    loadingSummary
  } = useSquadStore()

  const remaining = useMemo(
    () => squad.filter(s => !s.player).length,
    [squad]
  )

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* season */}
      <select className="chip" value={season} onChange={(e)=>setSeason(e.target.value)}>
        <option>2025-26</option>
        <option>2024-25</option>
      </select>

      {/* formation */}
      <select className="chip" value={formation} onChange={(e)=>setFormation(e.target.value)}>
        {['3-4-3','3-5-2','4-4-2','4-3-3','5-4-1','5-3-2'].map(f=> <option key={f} value={f}>{f}</option>)}
      </select>

      {/* budget */}
      <div className="flex items-center gap-2 text-sm ml-2">
        Budget
        <input className="input w-20" type="number" min={0} step={0.1}
               value={budget} onChange={(e)=>setBudget(Number(e.target.value))} />
        £m
      </div>

      <div className="text-sm text-white/60 ml-2">Remaining slots: {remaining}</div>

      <div className="ml-auto flex items-center gap-2">
        <button className="btn" onClick={() => { clearSquad(); }}>
          Clear
        </button>
        <button className="btn" onClick={() => loadSampleXI()}>
          Load Sample XI
        </button>
        <button className="btn btn-primary" disabled={loadingSummary} onClick={() => runOptimize()}>
          {loadingSummary ? 'Optimizing…' : 'Optimize Squad'}
        </button>
        <button className="btn" onClick={() => refreshSummary()}>
          Refresh
        </button>
      </div>
    </div>
  )
}

