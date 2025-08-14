import React, { useEffect, useMemo, useState } from 'react'
import { listPlayers, type Player } from '../lib/api'
import { useSquadStore } from '../state/useSquadStore'

function highlight(text: string, q: string) {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i === -1) return text
  return <>
    {text.slice(0,i)}<mark className="bg-yellow-300/30 text-yellow-200">{text.slice(i, i+q.length)}</mark>{text.slice(i+q.length)}
  </>
}

export default function PlayerPicker() {
  const [all, setAll] = useState<Player[]>([])
  const [q, setQ] = useState('')
  const [pos, setPos] = useState<'ALL'|'GK'|'DEF'|'MID'|'FWD'>('ALL')
  const { squad, bench, assignToSlot, addToBench } = useSquadStore()

  useEffect(()=>{ listPlayers().then(setAll).catch(console.error) }, [])

  const filtered = useMemo(()=>{
    const term = q.trim().toLowerCase()
    return all.filter(p=>{
      if (pos !== 'ALL' && p.position !== pos) return false
      if (!term) return true
      return p.name.toLowerCase().includes(term) || p.team.toLowerCase().includes(term)
    })
    .filter(p=>{
      // prevent duplicates already in team
      return !squad.some(s=>s.player?.id===p.id) && !bench.some(b=>b.player?.id===p.id)
    })
    .slice(0,200)
  }, [all, q, pos, squad, bench])

  const add = (p:Player) => {
    const idx = squad.findIndex(s=>!s.player && s.pos===p.position)
    if (idx>=0) assignToSlot(idx,p)
    else addToBench(p)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="font-medium">Player Picker</div>
        <div className="flex items-center gap-2">
          <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-1" value={pos} onChange={e=>setPos(e.target.value as any)}>
            <option>ALL</option><option>GK</option><option>DEF</option><option>MID</option><option>FWD</option>
          </select>
        </div>
      </div>
      <div className="panel-body space-y-3">
        <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
               placeholder="Search name or team…" value={q} onChange={e=>setQ(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[520px] overflow-auto pr-1">
          {filtered.map(p=>(
            <button key={p.id}
              onClick={()=>add(p)}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-left">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs">{p.position}</div>
              <div className="flex-1">
                <div className="font-medium">{highlight(p.name, q)}</div>
                <div className="text-xs text-white/60">{highlight(p.team, q)} · £{p.price.toFixed(1)}m</div>
              </div>
              <div className="text-xs text-white/70">Add</div>
            </button>
          ))}
          {filtered.length===0 && <div className="text-xs text-white/50">No players match your search.</div>}
        </div>
      </div>
    </div>
  )
}

