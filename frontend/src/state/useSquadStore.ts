import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Player } from '../lib/api'
import { listPlayers, optimizeSquad, squadSummary } from '../lib/api'

type Pos = 'GK' | 'DEF' | 'MID' | 'FWD'
type Slot = { pos: Pos; player?: Player | null }

function parseFormationStr(f: string) {
  const m = String(f || '').match(/^(\d)-(\d)-(\d)$/)
  const [DEF, MID, FWD] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [4, 4, 2]
  return { DEF, MID, FWD }
}

function mkEmptyXI(formation: string): Slot[] {
  const { DEF, MID, FWD } = parseFormationStr(formation)
  return [
    { pos: 'GK' },
    ...Array.from({ length: DEF }, () => ({ pos: 'DEF' as const })),
    ...Array.from({ length: MID }, () => ({ pos: 'MID' as const })),
    ...Array.from({ length: FWD }, () => ({ pos: 'FWD' as const })),
  ]
}

type Summary = {
  value: number
  in_bank: number
  points_by_position: { GK: number; DEF: number; MID: number; FWD: number }
  mvp?: Player & { score?: number }
  similarity_pct: number
  rank_history: number[]
} | null

type State = {
  season: string
  formation: string
  budget: number
  squad: Slot[]
  bench: Player[]
  benchSize: number
  summary: Summary
  loadingSummary: boolean

  pickerOpen: boolean
  pickerSlotIndex: number | null

  setSeason: (s: string) => void
  /** Hard reset (rebuilds empty XI for given formation). */
  setFormation: (f: string) => void
  /** Smart change (preserves players, moves overflow to bench). */
  changeFormation: (f: string) => void
  setBudget: (b: number) => void

  assignToSlot: (i: number, p: Player) => void
  removeFromSlot: (i: number) => void
  clearSquad: () => void

  loadSampleXI: () => Promise<void>
  runOptimize: () => Promise<void>
  refreshSummary: () => Promise<void>

  openPicker: (slotIndex: number) => void
  closePicker: () => void
}

export const useSquadStore = create<State>()(
  persist(
    (set, get) => ({
      season: '2025-26',
      formation: '4-4-2',
      budget: 100,
      squad: mkEmptyXI('4-4-2'),
      bench: [],
      benchSize: 4,
      summary: null,
      loadingSummary: false,

      pickerOpen: false,
      pickerSlotIndex: null,

      setSeason: (season) => set({ season }),

      // Hard reset (keep if you want a "Reset XI" button)
      setFormation: (formation) => set({ formation, squad: mkEmptyXI(formation) }),

      // Smart formation change
      changeFormation: (formation: string) =>
        set((state) => {
          const old = state.squad ?? []
          const bench = [...(state.bench ?? [])]

          const keepFirst = (pos: Pos, n: number) => {
            const picked = old.filter((s) => s.pos === pos && s.player).map((s) => s.player!) as Player[]
            const keep = picked.slice(0, n)
            const overflow = picked.slice(n)
            const line: Slot[] = [
              ...keep.map((p) => ({ pos, player: p })),
              ...Array.from({ length: Math.max(0, n - keep.length) }, () => ({ pos, player: undefined })),
            ]
            return { line, overflow }
          }

          const { DEF, MID, FWD } = parseFormationStr(formation)
          const gk = old.find((s) => s.pos === 'GK')?.player as Player | undefined

          const { line: defLine, overflow: defOverflow } = keepFirst('DEF', DEF)
          const { line: midLine, overflow: midOverflow } = keepFirst('MID', MID)
          const { line: fwdLine, overflow: fwdOverflow } = keepFirst('FWD', FWD)

          const overflowAll = [...defOverflow, ...midOverflow, ...fwdOverflow]
          for (const p of overflowAll) {
            if (!p) continue
            if (bench.length < (state.benchSize ?? 4) && !bench.some((b) => b.id === p.id)) {
              bench.push(p)
            }
            // else: dropped — optional toast
          }

          const squad: Slot[] = [{ pos: 'GK', player: gk }, ...defLine, ...midLine, ...fwdLine]
          return { formation, squad, bench }
        }),

      setBudget: (budget) => set({ budget }),

      assignToSlot: (i, p) => {
        const squad = [...get().squad]
        squad[i] = { ...squad[i], player: p }
        set({ squad })
      },

      removeFromSlot: (i) => {
        const squad = [...get().squad]
        squad[i] = { ...squad[i], player: undefined }
        set({ squad })
      },

      clearSquad: () => set({ squad: mkEmptyXI(get().formation), bench: [], summary: null }),

      loadSampleXI: async () => {
        const { season } = get()
        const defs = (await listPlayers('DEF', { season, limit: 50 })).players.sort((a, b) => a.price - b.price)
        const mids = (await listPlayers('MID', { season, limit: 50 })).players.sort((a, b) => a.price - b.price)
        const fwds = (await listPlayers('FWD', { season, limit: 50 })).players.sort((a, b) => a.price - b.price)
        const gks = (await listPlayers('GK', { season, limit: 10 })).players.sort((a, b) => a.price - b.price)

        const formation = get().formation
        const slots = mkEmptyXI(formation)
        let idx = 0
        slots[idx++].player = gks[0]
        const { DEF, MID, FWD } = parseFormationStr(formation)
        for (let i = 0; i < DEF; i++) slots[idx++].player = defs[i]
        for (let i = 0; i < MID; i++) slots[idx++].player = mids[i]
        for (let i = 0; i < FWD; i++) slots[idx++].player = fwds[i]
        set({ squad: slots })
        await get().refreshSummary()
      },

      runOptimize: async () => {
        const { season, budget, squad } = get()
        const xi_ids = squad.map((s) => s.player?.id || 0).filter(Boolean)
        const res = await optimizeSquad({ season, budget, lock_players: xi_ids, exclude_players: [] })

        let players: Player[] = Array.isArray(res?.players) ? res.players : []
        if (!players.length && Array.isArray(res?.xi_ids)) {
          const ids = res.xi_ids as number[]
          const posOrder = squad.map((s) => s.pos)
          const fetchPos = async (pos: string) => (await listPlayers(pos, { limit: 200, season })).players
          const pools = {
            GK: await fetchPos('GK'),
            DEF: await fetchPos('DEF'),
            MID: await fetchPos('MID'),
            FWD: await fetchPos('FWD'),
          }
          players = ids.map((id, i) => {
            const pos = posOrder[i]
            return pools[pos].find((p) => p.id === id) || pools[pos][0]
          })
        }
        const slots = squad.map((s, i) => ({ ...s, player: players[i] || s.player }))
        set({ squad: slots })
        await get().refreshSummary()
      },

      refreshSummary: async () => {
        const { season, budget, squad, bench } = get()
        const xi_ids = squad.map((s) => s.player?.id || 0)
        const bench_ids = bench.map((p) => p.id)
        set({ loadingSummary: true })
        try {
          const data = await squadSummary({ season, budget, xi_ids, bench_ids })
          set({ summary: data })
        } finally {
          set({ loadingSummary: false })
        }
      },

      openPicker: (slotIndex: number) => set({ pickerOpen: true, pickerSlotIndex: slotIndex }),
      closePicker: () => set({ pickerOpen: false, pickerSlotIndex: null }),
    }),
    { name: 'xgenius-squad' },
  ),
)
