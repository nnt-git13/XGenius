import React from 'react'
import { ShieldCheck, Lock, LockOpen, X } from 'lucide-react'
import { useSquadStore, type SquadSlot } from '../state/useSquadStore'
import Jersey from './Jersey'
// (no import from ./TeamGridParts)

function SlotCard({ slot, index }: { slot: SquadSlot; index: number }) {
  const { removeFromSlot, toggleLock, locks } = useSquadStore()
  const locked = !!slot.player && locks.includes(slot.player.id)

  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl p-3 bg-white/5 border border-white/10 min-w-[110px]">
      <div className="text-xs text-white/60">{slot.pos}</div>
      {slot.player ? (
        <>
          <Jersey team={slot.player.team} number={slot.player.id % 99 || 9} />
          <div className="text-sm">{slot.player.name}</div>
          <div className="text-xs text-white/60">
            {slot.player.team} · £{slot.player.price.toFixed(1)}m
          </div>
          <div className="flex gap-2 mt-1">
            <button
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              onClick={() => toggleLock(slot.player!.id)}
              aria-label={locked ? 'Unlock player' : 'Lock player'}
            >
              {locked ? <Lock size={14} /> : <LockOpen size={14} />}
            </button>
            <button
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              onClick={() => removeFromSlot(index)}
              aria-label="Remove player"
            >
              <X size={14} />
            </button>
          </div>
        </>
      ) : (
        <div className="text-xs text-white/40">Empty</div>
      )}
    </div>
  )
}

function Bench() {
  const { bench, removeFromBench } = useSquadStore()
  return (
    <div className="mt-4">
      <div className="text-sm font-medium mb-2">Bench</div>
      <div className="flex gap-3">
        {bench.map((b, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 rounded-xl p-3 bg-white/5 border border-white/10 min-w-[110px]"
          >
            {b.player ? (
              <>
                <Jersey team={b.player.team} number={b.player.id % 99 || 9} />
                <div className="text-sm">{b.player.name}</div>
                <div className="text-xs text-white/60">£{b.player.price.toFixed(1)}m</div>
                <button
                  className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                  onClick={() => removeFromBench(i)}
                  aria-label="Remove bench player"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="text-xs text-white/40">Empty</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TeamGrid() {
  const { squad, formation } = useSquadStore()

  const formationRows: Record<string, ('GK' | 'DEF' | 'MID' | 'FWD')[][]> = {
    '3-4-3': [['GK'], ['DEF', 'DEF', 'DEF'], ['MID', 'MID', 'MID', 'MID'], ['FWD', 'FWD', 'FWD']],
    '4-4-2': [['GK'], ['DEF', 'DEF', 'DEF', 'DEF'], ['MID', 'MID', 'MID', 'MID'], ['FWD', 'FWD']],
    '4-3-3': [['GK'], ['DEF', 'DEF', 'DEF', 'DEF'], ['MID', 'MID', 'MID'], ['FWD', 'FWD', 'FWD']],
    '3-5-2': [['GK'], ['DEF', 'DEF', 'DEF'], ['MID', 'MID', 'MID', 'MID', 'MID'], ['FWD', 'FWD']],
  }

  const rows = formationRows[formation] ?? formationRows['3-4-3']
  const used: boolean[] = Array(squad.length).fill(false)
  const takeNextIndex = (pos: SquadSlot['pos']) => {
    const idx = squad.findIndex((s, i) => !used[i] && s.pos === pos)
    if (idx >= 0) used[idx] = true
    return idx
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-white/70">
        Formation: <span className="font-medium">{formation}</span>
      </div>

      <div className="rounded-2xl p-6 border border-white/10 bg-gradient-to-b from-green-700/40 to-green-900/40">
        <div className="space-y-10">
          {rows.map((line, lineIdx) => (
            <div key={lineIdx} className="flex justify-center gap-4">
              {line.map((posKey, colIdx) => {
                const idx = takeNextIndex(posKey)
                if (idx === -1) {
                  return (
                    <div
                      key={`${lineIdx}-${colIdx}-empty`}
                      className="flex items-center justify-center rounded-xl p-3 bg-white/5 border border-white/10 min-w-[110px] min-h-[140px] text-xs text-white/40"
                    >
                      {posKey} Empty
                    </div>
                  )
                }
                return <SlotCard key={idx} slot={squad[idx]} index={idx} />
              })}
            </div>
          ))}
        </div>
      </div>

      <Bench />

      <div className="flex items-center gap-2 text-xs text-white/60">
        <ShieldCheck size={14} /> Tip: click a player in the picker to fill the first empty valid slot. Click ✕ to clear a slot.
      </div>
    </div>
  )
}
