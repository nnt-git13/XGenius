import React from 'react'
import Jersey from './Jersey'
import Badge from './Badge'
// Player type - should be defined based on API response
type Player = any
import { Lock, LockOpen, Ban } from 'lucide-react'

export default function PlayerCard({ p, locked, excluded, onLock, onExclude, footer }: {
  p: Player; locked?: boolean; excluded?: boolean; onLock?: ()=>void; onExclude?: ()=>void; footer?: React.ReactNode
}) {
  return (
    <div className={`card p-3 w-full ${excluded ? 'opacity-50' : ''}`}>
      <div className="flex gap-3 items-center">
        <Jersey team={p.team} />
        <div className="flex-1">
          <div className="text-lg font-semibold">{p.name}</div>
          <div className="text-sm text-white/60">{p.team} • {p.position} • £{p.price.toFixed(1)}m</div>
        </div>
        <div className="flex items-center gap-2">
          {onExclude && <button className="nav-link" onClick={onExclude} title="Exclude"><Ban size={18}/></button>}
          {onLock && (
            <button className="nav-link" onClick={onLock} title={locked? 'Unlock' : 'Lock'}>
              {locked ? <Lock size={18}/> : <LockOpen size={18}/>}
            </button>
          )}
        </div>
      </div>
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  )
}
