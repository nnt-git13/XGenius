import { listPlayers, type Player } from "./api";
import { useSquadStore } from "../state/useSquadStore";

type Pos = "GK" | "DEF" | "MID" | "FWD";

const POSITIONS: Pos[] = ["GK", "DEF", "MID", "FWD"];

function uniqById<T extends { id: number }>(arr: T[]) {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const x of arr) {
    if (!seen.has(x.id)) {
      seen.add(x.id);
      out.push(x);
    }
  }
  return out;
}

/** Fill empty XI slots from the CSV-backed /api/players pools (idempotent). */
export async function seedSampleXI(seasonFallback = "2024-25") {
  const store = useSquadStore.getState();
  const { season, assignToSlot } = store;

  // Read a fresh copy of state (don’t trust closures)
  const squadNow = useSquadStore.getState().squad;

  // Count empty slots in the XI by position + remember their indices
  const empties: Record<Pos, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const emptyIdxByPos: Record<Pos, number[]> = { GK: [], DEF: [], MID: [], FWD: [] };

  squadNow.forEach((slot, idx) => {
    if (!slot?.player && (slot.pos === "GK" || slot.pos === "DEF" || slot.pos === "MID" || slot.pos === "FWD")) {
      empties[slot.pos]++;
      emptyIdxByPos[slot.pos].push(idx);
    }
  });

  const hasEmpties = POSITIONS.some(p => empties[p] > 0);
  const benchHasAnything = (useSquadStore.getState().bench?.length ?? 0) > 0;

  // If XI already filled and bench started, do nothing
  if (!hasEmpties && benchHasAnything) return;

  // Pull pools in parallel (ask for a healthy page so we have choices)
  const seasonParam = season || seasonFallback;
  const poolsResp = await Promise.all(
    POSITIONS.map(pos => listPlayers(pos, { season: seasonParam, limit: 50, offset: 0 }))
  );

  const pools: Record<Pos, Player[]> = {
    GK: uniqById(poolsResp[0].players),
    DEF: uniqById(poolsResp[1].players),
    MID: uniqById(poolsResp[2].players),
    FWD: uniqById(poolsResp[3].players),
  };

  // Avoid picking anyone already in XI/bench
  const alreadyPicked = new Set<number>();
  squadNow.forEach(s => { if (s?.player) alreadyPicked.add(s.player.id); });
  (useSquadStore.getState().bench ?? []).forEach(b => { if (b) alreadyPicked.add(b.id); });

  const takeNext = (pos: Pos): Player | undefined => {
    const pool = pools[pos];
    while (pool.length) {
      const p = pool.shift()!;
      if (!alreadyPicked.has(p.id)) {
        alreadyPicked.add(p.id);
        return p;
      }
    }
    return undefined;
  };

  // Fill XI empties per position (stable indices)
  for (const pos of POSITIONS) {
    const targets = emptyIdxByPos[pos];
    for (const slotIndex of targets) {
      const choice = takeNext(pos);
      if (!choice) break;
      // assignToSlot(index, player)
      assignToSlot?.(slotIndex, choice);
    }
  }

  // Optionally seed the bench with up to one of each position IF the store supports it
  const benchSize = (useSquadStore.getState().benchSize as number | undefined) ?? 4;
  const addBench =
    (useSquadStore.getState() as any).addBenchPlayer ||
    (useSquadStore.getState() as any).addToBench ||
    null;

  if (addBench && (useSquadStore.getState().bench?.length ?? 0) < benchSize) {
    for (const pos of POSITIONS) {
      const currentBench = useSquadStore.getState().bench ?? [];
      if (currentBench.length >= benchSize) break;
      const choice = takeNext(pos);
      if (choice) {
        // call whichever method exists
        (addBench as (p: Player) => void)(choice);
      }
    }
  }
}
