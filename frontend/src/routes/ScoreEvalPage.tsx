import React, { useEffect, useMemo, useState } from 'react'
import { fetchScoreTable, uploadWeeklyScores, type PlayerWithScores } from '../lib/api'
import { useSquadStore } from '../state/useSquadStore'
import { FileUp, RefreshCw } from 'lucide-react'

type SortKey = 'name'|'team'|'position'|'price'|'total'|'form'|'fixture'|'hype'|'ev'

export default function ScoreEvalPage() {
  const { season } = useSquadStore()
  const [q, setQ] = useState('')
  const [pos, setPos] = useState<'ALL'|'GK'|'DEF'|'MID'|'FWD'>('ALL')
  const [rows, setRows] = useState<PlayerWithScores[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState<SortKey>('total')
  const [asc, setAsc] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { players, total } = await fetchScoreTable({ q, position: pos, limit: 500, season })
      setRows(players); setTotal(total)
    } finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [season]) // initial
  useEffect(()=>{ const t=setTimeout(load, 200); return ()=>clearTimeout(t) }, [q, pos]) // debounced

  const sorted = useMemo(()=>{
    const get = (r: PlayerWithScores, key: SortKey) => {
      const s = r.score || {}
      switch (key) {
        case 'name': return r.name.toLowerCase()
        case 'team': return r.team.toLowerCase()
        case 'position': return r.position
        case 'price': return r.price
        case 'total': return Number(s.total_score ?? s.ev ?? 0)
        case 'form': return Number(s.form ?? 0)
        case 'fixture': return Number(s.fixture ?? 0)
        case 'hype': return Number(r.hype ?? s.hype ?? 0)
        case 'ev': return Number(s.ev ?? 0)
      }
    }
    const arr = [...rows].sort((a,b)=> {
      const va = get(a,sort); const vb = get(b,sort)
      if (va < vb) return asc? -1 : 1
      if (va > vb) return asc? 1 : -1
      return 0
    })
    return arr
  }, [rows, sort, asc])

  return (
    <div className="page py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Score evaluation</h1>

      <section className="panel">
        <div className="panel-header">
          <div className="font-medium">Players · {total}</div>
          <button onClick={load} className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm flex items-center gap-2">
            <RefreshCw size={14}/> Refresh
          </button>
        </div>
        <div className="panel-body space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2" placeholder="Search name or team…" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-2" value={pos} onChange={e=>setPos(e.target.value as any)}>
              <option>ALL</option><option>GK</option><option>DEF</option><option>MID</option><option>FWD</option>
            </select>
            <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-2" value={sort} onChange={e=>setSort(e.target.value as SortKey)}>
              <option value="total">Sort: Total</option>
              <option value="ev">Sort: EV</option>
              <option value="form">Sort: Form</option>
              <option value="fixture">Sort: Fixture</option>
              <option value="hype">Sort: Hype</option>
              <option value="price">Sort: Price</option>
              <option value="name">Sort: Name</option>
              <option value="team">Sort: Team</option>
            </select>
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={asc} onChange={e=>setAsc(e.target.checked)} />
              Asc
            </label>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-white/60">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Pos</th>
                  <th className="text-left p-2">Team</th>
                  <th className="text-right p-2">£</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">EV</th>
                  <th className="text-right p-2">Form</th>
                  <th className="text-right p-2">Fixture</th>
                  <th className="text-right p-2">Hype</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(p=>(
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-2 font-medium">{p.name}</td>
                    <td className="p-2">{p.position}</td>
                    <td className="p-2">{p.team}</td>
                    <td className="p-2 text-right">{p.price.toFixed(1)}</td>
                    <td className="p-2 text-right">{Number(p.score?.total_score ?? p.score?.ev ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(p.score?.ev ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(p.score?.form ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(p.score?.fixture ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right">{Number(p.hype ?? p.score?.hype ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
                {loading && <tr><td className="p-4 text-center text-white/60" colSpan={9}>Loading…</td></tr>}
                {!loading && sorted.length===0 && <tr><td className="p-4 text-center text-white/60" colSpan={9}>No players</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Weekly scores uploader */}
      <ScoresUploader />
    </div>
  )
}

function ScoresUploader() {
  const { season } = useSquadStore()
  const [file, setFile] = useState<File | null>(null)
  const [gw, setGw] = useState<number>(1)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!file) return
    setBusy(true); setMsg(null)
    try {
      const res = await uploadWeeklyScores(file, season, gw)
      setMsg(res?.ok ? 'Uploaded' : JSON.stringify(res))
    } catch (e:any) {
      setMsg(e?.message || 'Upload failed')
    } finally { setBusy(false) }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="font-medium">Update weekly scores</div>
      </div>
      <div className="panel-body flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <div className="text-white/60 mb-1">Gameweek</div>
          <input type="number" min={1} max={38} value={gw} onChange={e=>setGw(Number(e.target.value))}
                 className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 w-24"/>
        </label>
        <label className="text-xs">
          <div className="text-white/60 mb-1">CSV File</div>
          <input type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0] || null)}
                 className="bg-white/5 border border-white/10 rounded-lg px-2 py-2"/>
        </label>
        <button onClick={submit} disabled={!file || busy}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2">
          <FileUp size={14}/> {busy ? 'Uploading…' : 'Upload'}
        </button>
        {msg && <div className="text-xs text-white/70">{msg}</div>}
      </div>
    </section>
  )
}
