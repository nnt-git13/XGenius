import React, { useEffect, useMemo, useRef } from "react";
import MiniRankChart from "../components/MiniRankChart";
import PointsByPosition from "../components/PointsByPosition";
import SimilarityBars from "../components/SimilarityBars";
import Pitch from "../components/Pitch";
import DevBoundary from "../components/DevBoundary";
import PlayerPickerModal from "../components/PlayerPickerModal";
import { useSquadStore } from "../state/useSquadStore";

/* ---------- helpers ---------- */
type Pos = "GK" | "DEF" | "MID" | "FWD";

function parseFormation(s?: string): { DEF: number; MID: number; FWD: number } {
  const m = String(s || "").match(/^(\d)-(\d)-(\d)$/);
  const [d, mi, f] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [4, 4, 2];
  return { DEF: d, MID: mi, FWD: f };
}

/* ----------------------------------------------------- */

export default function MyTeamPage() {
  const {
    formation,
    season,
    summary,
    squad,

    openPicker,
    removeFromSlot,
    changeFormation,
    setFormation,
    clearSquad,
    loadSampleXI,
    runOptimize,
    refreshSummary,
  } = useSquadStore((s: any) => ({
    formation: s.formation,
    season: s.season,
    summary: s.summary,
    squad: s.squad,

    openPicker: s.openPicker,
    removeFromSlot: s.removeFromSlot,
    changeFormation: s.changeFormation,
    setFormation: s.setFormation,
    clearSquad: s.clearSquad,
    loadSampleXI: s.loadSampleXI,
    runOptimize: s.runOptimize,
    refreshSummary: s.refreshSummary,
  }));

  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    const empty = !Array.isArray(squad) || squad.length === 0 || squad.every(s => !s?.player);
    if (empty) {
      seededRef.current = true;
      void loadSampleXI();
    }
  }, [squad, loadSampleXI]);

  const rows = useMemo(() => {
    const counts = parseFormation(formation);
    const makeTile = (index: number) => {
      const slot = squad?.[index];
      const p = slot?.player;
      return {
        index,
        position: slot?.pos as Pos,
        name: p?.name,
        team: p?.team,
        price: typeof p?.price === "number" ? p.price : undefined,
        empty: !p,
      };
    };

    const GK: any[] = [];
    const DEF: any[] = [];
    const MID: any[] = [];
    const FWD: any[] = [];

    let idx = 0;
    if (squad?.[idx]) GK.push(makeTile(idx));
    idx += 1;

    for (let i = 0; i < counts.DEF && squad?.[idx + i]; i++) DEF.push(makeTile(idx + i));
    idx += counts.DEF;

    for (let i = 0; i < counts.MID && squad?.[idx + i]; i++) MID.push(makeTile(idx + i));
    idx += counts.MID;

    for (let i = 0; i < counts.FWD && squad?.[idx + i]; i++) FWD.push(makeTile(idx + i));

    return { GK, DEF, MID, FWD };
  }, [squad, formation]);

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* LEFT */}
      <section className="col-span-12 2xl:col-span-12 space-y-5">
        <div className="panel">
          <div className="panel-body flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">⚽</div>
              <div>
                <div className="text-xs text-white/60">My Team</div>
                <div className="text-xl font-semibold">FC XGenius</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-8 text-sm">
              <div><div className="text-white/60">Total Points</div><div className="font-semibold">1965</div></div>
              <div><div className="text-white/60">Rank</div><div className="font-semibold">12,821</div></div>
              <div><div className="text-white/60">Old Rank</div><div className="font-semibold">15,223</div></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="text-lg font-semibold">Dashboard</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="chip">Rank</span>
              <span className="chip opacity-60">Points</span>
            </div>
          </div>
          <div className="panel-body space-y-5">
            <DevBoundary label="MiniRankChart">
              <MiniRankChart points={[900000,600000,420000,500000,350000,280000,200000,220000,180000,160000,140000,170000,150000]} />
            </DevBoundary>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="panel panel-compact">
            <div className="panel-header"><div className="font-medium">Your MVP</div></div>
            <div className="panel-body">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-xl bg-white/10 border border-white/10" />
                <div className="text-sm">
                  <div className="font-semibold">Trent Alexander-Arnold</div>
                  <div className="text-xs text-white/60">Games 23 · Minutes 2087 · Goals 3 · Assists 14 · CS 11</div>
                  <div className="mt-1 text-green-300 font-semibold">Total 187 · £7.8m</div>
                </div>
              </div>
            </div>
          </div>
          <div className="panel panel-compact">
            <div className="panel-header"><div className="font-medium">Similarity to top10k</div></div>
            <div className="panel-body">
              <DevBoundary label="SimilarityBars"><SimilarityBars pct={53} /></DevBoundary>
            </div>
          </div>
          <div className="panel panel-compact">
            <div className="panel-header"><div className="font-medium">Team value</div></div>
            <div className="panel-body">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-white/60">Squad</div><div className="font-semibold">£104.8m</div></div>
                <div><div className="text-white/60">Δ</div><div className="font-semibold">+£0.4m</div></div>
                <div><div className="text-white/60">In bank</div><div className="font-semibold">£1.4m</div></div>
                <div><div className="text-white/60">Transfers</div><div className="font-semibold">38</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div className="font-medium">Points by position</div></div>
          <div className="panel-body">
            <DevBoundary label="PointsByPosition"><PointsByPosition /></DevBoundary>
          </div>
        </div>
      </section>

      {/* RIGHT */}
      <aside className="col-span-12 2xl:col-span-12">
        <div className="panel sticky-top">
          <div className="panel-header">
            <div>
              <div className="text-sm text-white/60">Gameweek</div>
              <div className="font-medium flex items-center gap-2">
                XI ·
                <select
                  value={formation}
                  onChange={(e) => changeFormation?.(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm"
                >
                  {['3-4-3','3-5-2','4-4-2','4-3-3','4-5-1','5-3-2','5-4-1'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-sm grid grid-cols-3 gap-4">
              <div><div className="text-white/60">Points</div><div className="font-semibold">0</div></div>
              <div><div className="text-white/60">Value</div><div className="font-semibold">£{summary ? summary.value.toFixed(1) : "0.0"}</div></div>
              <div><div className="text-white/60">Overall</div><div className="font-semibold">
                {summary ? summary.rank_history.at(-1)?.toLocaleString() : "—"} <span className="text-green-400">▲</span>
              </div></div>
            </div>
          </div>

          {/* NO horizontal scroll needed — pitch will fit */}
          <div className="panel-body">
            {/* Actions toolbar */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button className="btn" onClick={() => setFormation?.(formation)}>Reset XI</button>
              <button className="btn" onClick={clearSquad}>Clear</button>
              <button className="btn" onClick={refreshSummary}>Refresh Summary</button>
              <div className="flex-1" />
              <button className="btn" onClick={loadSampleXI}>Load Sample XI</button>
              <button className="btn btn-primary" onClick={runOptimize}>Optimize Squad</button>
            </div>

            <DevBoundary label="Pitch">
              <Pitch
                rows={rows as any}
                onPick={(slotIndex: number) => openPicker?.(slotIndex)}
                onRemove={(slotIndex: number) => removeFromSlot?.(slotIndex)}
              />
            </DevBoundary>
          </div>
        </div>
      </aside>

      <PlayerPickerModal />
    </div>
  );
}
