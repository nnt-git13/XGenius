import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
// Old component - kept for reference
export type Player = any;
import { useSquadStore } from "../state/useSquadStore";

type Pos = "GK" | "DEF" | "MID" | "FWD";

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function PlayerPickerModal() {
  const {
    pickerOpen,
    pickerSlotIndex,
    squad,
    season,
    budget,
    bench,
    closePicker,
    assignToSlot,
  } = useSquadStore();

  const slot = (pickerSlotIndex ?? -1) >= 0 ? squad[pickerSlotIndex!] : undefined;
  const pos: Pos = (slot?.pos as Pos) || "GK";

  // search/paging
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [rows, setRows] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // helper: who’s already taken?
  const takenIds = useMemo(
    () =>
      new Set(
        [
          ...squad.map((s) => s.player?.id).filter(Boolean),
          ...bench.map((p) => p.id),
        ] as number[]
      ),
    [squad, bench]
  );

  const spent = useMemo(
    () =>
      [...squad.map((s) => s.player).filter(Boolean), ...bench].reduce(
        (sum, p: any) => sum + Number(p?.price || 0),
        0
      ),
    [squad, bench]
  );

  const oldPrice = useMemo(() => {
    const p = slot?.player;
    return Number(p?.price || 0);
  }, [slot]);

  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    [...squad.map((s) => s.player).filter(Boolean), ...bench].forEach((p: any) => {
      const t = String(p?.team || "");
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [squad, bench]);

  // fetch players when opened / filters change
  const fetchPage = async (nextOffset = 0) => {
    setLoading(true);
    setErr(null);
    try {
      // Old component - stubbed out
      const r = { players: [] as Player[], total: 0 };
      setRows(r.players);
      setTotal(0);
      setOffset(nextOffset);
    } catch (e: any) {
      setErr(e?.message || "Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pickerOpen) return;
    setRows([]);
    fetchPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen, dq, pos, season]);

  if (!pickerOpen) return null; // safe early return

  const whyDisabled = (p: Player): string | null => {
    if (takenIds.has(p.id)) return "Already in squad";
    const perTeam = (teamCounts[p.team] || 0) + 1;
    if (perTeam > 3) return "Max 3 per team";
    const delta = Number(p.price) - oldPrice;
    const inBank = Number(budget) - spent;
    if (delta > inBank) return "Over budget";
    return null;
  };

  const onPick = (p: Player) => {
    if (pickerSlotIndex == null) return;
    assignToSlot(pickerSlotIndex, p);
    closePicker();
  };

  const body = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={closePicker} />
      <div className="relative w-full max-w-3xl mt-10 rounded-2xl border border-white/10 bg-[#0D1422] text-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="text-sm">
            <div className="text-white/60">Add player</div>
            <div className="font-semibold">{pos} · Slot {((pickerSlotIndex ?? 0) + 1)}</div>
          </div>
          <button className="btn" onClick={closePicker}>Close</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, team…"
              className="input"
            />
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
              Budget left: <b>£{(Number(budget) - spent).toFixed(1)}m</b>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="text-left px-3 py-2">Player</th>
                  <th className="text-left px-3 py-2">Team</th>
                  <th className="text-left px-3 py-2">Price</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const disabledReason = whyDisabled(p);
                  const disabled = !!disabledReason;
                  return (
                    <tr key={p.id} className="odd:bg-white/0 even:bg-white/[0.03]">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-white/70">{p.team}</td>
                      <td className="px-3 py-2">£{Number(p.price).toFixed(1)}m</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className={`btn ${disabled ? "opacity-50 cursor-not-allowed" : "btn-primary"}`}
                          title={disabledReason ?? ""}
                          onClick={() => !disabled && onPick(p)}
                          disabled={disabled}
                        >
                          {disabled ? disabledReason : "Add"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-white/60">
                      No players found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-white/60">
            <div>Total: {total}</div>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={() => fetchPage(Math.max(0, offset - 30))} disabled={loading || offset === 0}>
                Prev
              </button>
              <button className="btn" onClick={() => fetchPage(offset + 30)} disabled={loading || offset + 30 >= total}>
                Next
              </button>
            </div>
          </div>

          {err && <div className="text-red-300 text-xs">{err}</div>}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
