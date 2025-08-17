import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { listPlayers, type Player } from "../lib/api";
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
const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

export default function PlayerPickerModal() {
  // 1) All hooks unconditionally at top
  const store = useSquadStore();
  const {
    pickerOpen,
    pickerSlotIndex,
    closePicker,
    assignToSlot,
    squad: _squad,
    bench: _bench,
    season,
    budget,
  } = store;

  const squad = _squad ?? [];
  const bench = _bench ?? [];

  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);

  const [rows, setRows] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const pos: Pos | undefined = useMemo(() => {
    if (pickerSlotIndex == null) return undefined;
    return squad[pickerSlotIndex]?.pos as Pos | undefined;
  }, [pickerSlotIndex, squad]);

  const currentPlayer = useMemo(() => {
    if (pickerSlotIndex == null) return null;
    return (squad[pickerSlotIndex]?.player ?? null) as Player | null;
  }, [pickerSlotIndex, squad]);

  // Exclude current slot from “taken” so swaps are allowed
  const takenIds = useMemo(() => {
    const ids = new Set<number>();
    squad.forEach((s, i) => {
      if (i === pickerSlotIndex) return;
      const id = s?.player?.id as number | undefined;
      if (id) ids.add(id);
    });
    bench.forEach(b => { if (b?.id) ids.add(b.id); });
    return ids;
  }, [squad, bench, pickerSlotIndex]);

  const teamCounts = useMemo(() => {
    const c: Record<string, number> = {};
    squad.forEach((s, i) => {
      if (i === pickerSlotIndex) return;
      const p = s?.player as Player | undefined;
      if (p?.team) c[p.team] = (c[p.team] || 0) + 1;
    });
    bench.forEach(p => { if (p?.team) c[p.team] = (c[p.team] || 0) + 1; });
    return c;
  }, [squad, bench, pickerSlotIndex]);

  const spentExcludingSlot = useMemo(() => {
    const xi = squad.map(s => s?.player).filter(Boolean) as Player[];
    const total = [...xi, ...bench].reduce((sum, p) => sum + Number(p.price || 0), 0);
    const old = Number(currentPlayer?.price || 0);
    return total - old;
  }, [squad, bench, currentPlayer]);

  const budgetLeft = Math.max(0, Number(budget) - spentExcludingSlot);

  // 2) Effects may early-exit inside their callback (that’s safe)
  useEffect(() => {
    if (!pickerOpen) return;
    setQ(""); setOffset(0); setRows([]); setErr(null);
  }, [pickerOpen, pickerSlotIndex]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePicker();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen, closePicker]);

  const fetchPage = async (nextOffset = 0) => {
    if (!pos) return;
    setLoading(true); setErr(null);
    try {
      const { players, total } = await listPlayers(pos, {
        q: dq || undefined,
        season: season || "2025-26",
        limit: 30,
        offset: nextOffset,
      });
      setRows(players ?? []);
      setTotal(Number(total || 0));
      setOffset(nextOffset);
    } catch (e: any) {
      setErr(e?.message || "Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pickerOpen || !pos) return;
    fetchPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen, dq, pos, season]);

  // 3) Render decision happens AFTER hooks are set up
  const shouldShow = pickerOpen && pickerSlotIndex != null && !!pos;

  const whyDisabled = (p: Player): string | null => {
    if (takenIds.has(p.id)) return "Already in squad";
    if ((teamCounts[p.team] || 0) + 1 > 3) return "Max 3 per team";
    if (Number(p.price || 0) > budgetLeft) return "Over budget";
    return null;
  };

  const pick = (p: Player) => { assignToSlot(pickerSlotIndex!, p); closePicker(); };

  if (!shouldShow) return null;

  const body = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={closePicker} />
      <div className="relative w-full max-w-3xl mt-10 rounded-2xl border border-white/10 bg-[#0D1422] text-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="text-sm">
            <div className="text-white/60">Add player</div>
            <div className="font-semibold">{pos} · Slot {pickerSlotIndex! + 1}</div>
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
              autoFocus
            />
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
              Budget left: <b>£{budgetLeft.toFixed(1)}m</b>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="text-left px-3 py-2">Player</th>
                  <th className="text-left px-3 py-2">Team</th>
                  <th className="text-left px-3 py-2">Price</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const disabledReason = whyDisabled(p);
                  const disabled = !!disabledReason;
                  return (
                    <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-white/70">{p.team}</td>
                      <td className="px-3 py-2">£{Number(p.price ?? 0).toFixed(1)}m</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className={clsx("btn", disabled ? "opacity-50 cursor-not-allowed" : "btn-primary")}
                          title={disabledReason ?? ""}
                          onClick={() => !disabled && pick(p)}
                          disabled={disabled}
                        >
                          {disabled ? disabledReason : "Select"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!loading && rows.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-white/60">No players found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-white/60">
            <div>Total: {total}</div>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={() => fetchPage(Math.max(0, offset - 30))} disabled={loading || offset === 0}>Prev</button>
              <button className="btn" onClick={() => fetchPage(offset + 30)} disabled={loading || offset + 30 >= total}>Next</button>
            </div>
          </div>

          {err && <div className="text-red-300 text-xs">{err}</div>}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
