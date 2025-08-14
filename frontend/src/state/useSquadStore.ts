import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Player } from '../lib/api'

type Pos = 'GK'|'DEF'|'MID'|'FWD'
type Formation = '3-4-3'|'4-4-2'|'4-3-3'|'3-5-2'

export type SquadSlot = { pos: Pos; player?: Player; locked?: boolean }
export type BenchSlot = { player?: Player }

type SquadState = {
  season: string
  budget: number
  formation: Formation
  squad: SquadSlot[]       // 11 slots = starting XI (pos-typed)
  bench: BenchSlot[]       // 4 bench slots (FPL-style)
  exclude: number[]
  locks: number[]
  setSeason: (s: string) => void
  setBudget: (b: number) => void
  setFormation: (f: Formation) => void
  assignToSlot: (index: number, p: Player) => void
  removeFromSlot: (index: number) => void
  addToBench: (p: Player) => void
  removeFromBench: (index: number) => void
  toggleLock: (pid: number) => void
  toggleExclude: (pid: number) => void
  clearAll: () => void
  resetXIFromPositions: (positions: Pos[]) => void
}

const defaultXI: SquadSlot[] = [
  { pos:'GK' },                         // 0
  { pos:'DEF' },{ pos:'DEF' },{ pos:'DEF' }, // 1-3
  { pos:'MID' },{ pos:'MID' },{ pos:'MID' },{ pos:'MID' }, // 4-7
  { pos:'FWD' },{ pos:'FWD' },{ pos:'FWD' }, // 8-10
]

const mapFormation = (f: Formation): Pos[] => {
  if (f==='4-4-2') return ['GK','DEF','DEF','DEF','DEF','MID','MID','MID','MID','FWD','FWD']
  if (f==='4-3-3') return ['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD']
  if (f==='3-5-2') return ['GK','DEF','DEF','DEF','MID','MID','MID','MID','MID','FWD','FWD']
  return ['GK','DEF','DEF','DEF','MID','MID','MID','MID','FWD','FWD','FWD'] // 3-4-3
}

export const useSquadStore = create<SquadState>()(persist((set,get)=>({
  season: '2024-25',
  budget: 100,
  formation: '3-4-3',
  squad: defaultXI,
  bench: [{},{},{},{}],
  exclude: [],
  locks: [],
  setSeason: (s)=>set({season:s}),
  setBudget: (b)=>set({budget:b}),
  setFormation: (f)=>{
    const positions = mapFormation(f)
    get().resetXIFromPositions(positions)
    set({formation:f})
  },
  assignToSlot: (i,p)=>{
    set(({squad})=>{
      const next=[...squad]; next[i]={...next[i], player:p}; return {squad:next}
    })
  },
  removeFromSlot: (i)=>{
    set(({squad})=>{
      const next=[...squad]; next[i]={...next[i], player:undefined, locked:false}; return {squad:next}
    })
  },
  addToBench: (p)=>{
    set(({bench})=>{
      const next=[...bench]; const idx=next.findIndex(b=>!b.player)
      if (idx>=0) next[idx]={player:p}; else next.push({player:p})
      return {bench:next.slice(0,4)}
    })
  },
  removeFromBench: (i)=>{
    set(({bench})=>{
      const next=[...bench]; next[i]={}; return {bench:next}
    })
  },
  toggleLock: (pid)=>{
    const {locks}=get()
    set({locks: locks.includes(pid) ? locks.filter(x=>x!==pid) : [...locks,pid]})
  },
  toggleExclude: (pid)=>{
    const {exclude}=get()
    set({exclude: exclude.includes(pid) ? exclude.filter(x=>x!==pid) : [...exclude,pid]})
  },
  clearAll: ()=>set({squad:defaultXI, bench:[{},{},{},{}], locks:[], exclude:[]}),
  resetXIFromPositions: (positions)=>{
    set(({squad})=>{
      const kept = squad.map((slot, i)=> slot.player && slot.player.position===positions[i] ? slot : { pos: positions[i] as Pos })
      return {squad: kept}
    })
  },
}), { name:'xgenius-squad' }))
