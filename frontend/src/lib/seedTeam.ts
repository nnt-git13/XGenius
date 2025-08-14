import { listPlayers, type Player } from './api'
import { useSquadStore } from '../state/useSquadStore'

type Pos = 'GK'|'DEF'|'MID'|'FWD'

/**
 * Pulls players from backend and fills the current formation:
 * - Uses current formation in the store to know how many of each position
 * - Picks the first N per position (backend is already sorted by name; change to price later if you like)
 * - Prevents duplicates; fills bench GK/DEF/MID/FWD as 1 each when available
 */
export async function seedSampleXI(seasonFallback = '2024-25') {
  const store = useSquadStore.getState()
  const { squad, assignToSlot, addToBench, season } = store

  // How many we need for each position in current XI
  const need: Record<Pos, number> = { GK:0, DEF:0, MID:0, FWD:0 }
  squad.forEach(s => { need[s.pos as Pos] = (need[s.pos as Pos] ?? 0) + 1 })

  const picked = new Set<number>()
  const ensureUnique = (arr: Player[]) => arr.filter(p => !picked.has(p.id))

  // Fill each line by position
  for (const pos of ['GK','DEF','MID','FWD'] as Pos[]) {
    if (need[pos] <= 0) continue
    const { players } = await listPlayers({ position: pos, limit: 50, season: season || seasonFallback })
    const pool = ensureUnique(players)
    let remaining = need[pos]

    for (let i = 0; i < squad.length && remaining > 0; i++) {
      if (!squad[i].player && squad[i].pos === pos) {
        const p = pool.shift()
        if (!p) break
        picked.add(p.id)
        assignToSlot(i, p)
        remaining--
      }
    }
  }

  // Bench: try GK, DEF, MID, FWD (one each)
  const benchOrder: Pos[] = ['GK','DEF','MID','FWD']
  for (const pos of benchOrder) {
    const { players } = await listPlayers({ position: pos, limit: 10, season: season || seasonFallback })
    const pool = players.filter(p => !picked.has(p.id))
    if (pool.length > 0) {
      addToBench(pool[0])
      picked.add(pool[0].id)
    }
  }
}
