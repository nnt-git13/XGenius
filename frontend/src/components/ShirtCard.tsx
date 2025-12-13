import React from 'react'
import Jersey from './Jersey'
import { X } from 'lucide-react'
import { useSquadStore } from '../state/useSquadStore'
// Old component
type Player = any

type Pos = 'GK'|'DEF'|'MID'|'FWD'
type Slot = { pos: Pos; player?: Player | null }

const kit: Record<string,string> = {
  Arsenal:'#EF0107', Chelsea:'#034694','Manchester City':'#6CABDD',
  'Manchester United':'#DA291C', Newcastle:'#241F20','West Ham':'#7A263A'
}

export default function ShirtCard({ slot, index, gwPoints=0 }:{
  slot: Slot; index: number; gwPoints?: number
}) {
  const { removeFromSlot } = useSquadStore()
  if(!slot.player) return (
    <div className="shirt-card w-[120px]">
      <div className="text-white/60 text-[11px] mb-1 tracking-wide">{slot.pos}</div>
      <div className="text-white/40 text-xs">Empty</div>
    </div>
  )
  const p = slot.player
  return (
    <div className="shirt-card w-[132px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white/60 text-[11px] tracking-wide">{slot.pos}</span>
        <div className="flex gap-1">
          <button className="p-1 rounded-md hover:bg-white/10" onClick={()=>removeFromSlot(index)} aria-label="Remove"><X size={14}/></button>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="rounded-xl p-1.5" style={{background:(kit[p.team]||'#444')+'30'}}>
          <Jersey team={p.team} number={p.id%99||9} size={64}/>
        </div>
        <div className="mt-1 font-medium leading-tight text-[13px] text-center line-clamp-2">{p.name}</div>
        <div className="text-[11px] text-white/60">£{p.price.toFixed(1)}m</div>
        <div className="points-band leading-none">{gwPoints}</div>
        <div className="shirt-footer">{p.team}</div>
      </div>
    </div>
  )
}
