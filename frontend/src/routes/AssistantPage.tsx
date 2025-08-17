import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { askAssistant, tradeAdvice, listPlayers, type Player } from '../lib/api'
import { useSquadStore } from '../state/useSquadStore'
import { Send, Sparkles, ArrowLeftRight, Loader2 } from 'lucide-react'

type ChatMsg = { role: 'user'|'assistant'; text: string; ts: number }
type TradeAdviceRes = {
  delta_ev?: number
  delta_long_term?: number
  reason?: string
  error?: string
} | null

function Bubble({ msg }: { msg: ChatMsg }) {
  const me = msg.role === 'user'
  return (
    <div className={`max-w-[75%] ${me ? 'ml-auto' : ''}`}>
      <div className={`rounded-2xl px-3 py-2 text-sm border ${me ? 'bg-green-500/20 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
        {msg.text}
      </div>
      <div className="text-[10px] text-white/50 mt-1">{new Date(msg.ts).toLocaleTimeString()}</div>
    </div>
  )
}

const suggestions = [
  'Should I captain Haaland or Saka this week?',
  'Is a 3-5-2 better than 3-4-3 for GW1?',
  'Which 6.5m midfielder has the best EV next 3 GWs?',
  'Is it time to sell a Chelsea defender?'
]

export default function AssistantPage() {
  const store = useSquadStore()
  const season = store.season
  const budget = store.budget
  const squad = Array.isArray(store.squad) ? store.squad : [] // ✅ guard

  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: 999999, behavior: 'smooth' })
  }, [msgs])

  const context = useMemo(() => ({
    season, budget,
    squad: squad.map(s => ({ pos: s.pos, id: s.player?.id ?? null, name: s.player?.name ?? null })),
  }), [season, budget, squad])

  const send = async (text: string) => {
    if (!text.trim()) return
    setMsgs(m => [...m, { role: 'user', text, ts: Date.now() }])
    setQ(''); setBusy(true)
    try {
      // ✅ pass an object unless your helper explicitly wants a JSON string
      const data = await askAssistant(text, context)
      const answer = (data && (data.answer ?? data.text)) ?? JSON.stringify(data)
      setMsgs(m => [...m, { role: 'assistant', text: answer, ts: Date.now() }])
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'assistant', text: e?.message || 'Error contacting assistant.', ts: Date.now() }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Chat takes 8–9 columns on big screens, full width on small */}
      <section className="col-span-12 xl:col-span-8 2xl:col-span-9 panel flex flex-col h-[calc(100vh-180px)]">
        <div className="panel-header">
          <div className="flex items-center gap-2"><Sparkles size={16}/><div className="font-medium">Strategy Assistant</div></div>
          <div className="text-xs text-white/60">Season {season} · Budget £{budget}m</div>
        </div>

        {/* scroller grows to fill */}
        <div ref={scroller} className="panel-body flex-1 overflow-auto space-y-3">
          {msgs.length === 0 && (
            <div className="text-sm text-white/60">Ask anything about captains, transfers, chip timing, fixture runs…</div>
          )}
          {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
        </div>

        {/* input row */}
        <div className="border-t border-white/10 p-4 flex items-center gap-3">
          <input
            className="input"
            placeholder="Ask the assistant…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(q)}
          />
          <button onClick={() => send(q)} disabled={busy} className="btn btn-primary">
            {busy && <Loader2 className="animate-spin" size={16}/>} <Send size={16}/>
          </button>
        </div>

        {/* chips */}
        <div className="border-t border-white/10 p-4 flex flex-wrap gap-2">
          {suggestions.map(s => <button key={s} onClick={()=>send(s)} className="chip">{s}</button>)}
        </div>
      </section>

      {/* Trade comparison sticks on the side */}
      <aside className="col-span-12 xl:col-span-4 2xl:col-span-3">
        <div className="panel sticky-top">
          <div className="panel-header">
            <div className="flex items-center gap-2"><ArrowLeftRight size={16}/><div className="font-medium">Trade comparison</div></div>
          </div>
          <div className="panel-body space-y-4">
            {/* …your existing SelectPlayer + button + results … */}
          </div>
        </div>
      </aside>
    </div>
  )
}

function TradeCompare() {
  const { season } = useSquadStore()
  const [all, setAll] = useState<Player[]>([])
  const [outId, setOut] = useState<number | ''>('')
  const [inId, setIn] = useState<number | ''>('')
  const [res, setRes] = useState<TradeAdviceRes>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listPlayers()
      .then(d => setAll(Array.isArray(d) ? d : []))
      .catch(() => setAll([]))
  }, [season])

  const go = async () => {
    if (!outId || !inId) return
    setBusy(true)
    try {
      const r = await tradeAdvice(season, Number(outId), Number(inId))
      // ✅ ensure object shape
      const obj = (r && typeof r === 'object') ? r as TradeAdviceRes : { error: 'Unexpected response' }
      setRes(obj)
    } catch {
      setRes({ error: 'Trade advice failed' })
    } finally {
      setBusy(false)
    }
  }

  const isObj = (v: any): v is NonNullable<TradeAdviceRes> => !!v && typeof v === 'object'

  return (
    <section className="panel h-fit">
      <div className="panel-header">
        <div className="flex items-center gap-2"><ArrowLeftRight size={16}/><div className="font-medium">Trade comparison</div></div>
      </div>
      <div className="panel-body space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SelectPlayer label="Out" value={outId} onChange={setOut} options={all}/>
          <SelectPlayer label="In"  value={inId}  onChange={setIn}  options={all}/>
        </div>
        <button onClick={go} disabled={busy || !outId || !inId}
                className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">
          {busy ? 'Analyzing…' : 'Evaluate trade'}
        </button>

        {isObj(res) && (
          <div className="text-sm space-y-2 bg-white/5 border border-white/10 p-3 rounded-xl">
            {typeof res.delta_ev === 'number' && <div>Δ EV next GW: <b>{res.delta_ev.toFixed(2)}</b></div>}
            {typeof res.delta_long_term === 'number' && <div>Δ Long-term: <b>{res.delta_long_term.toFixed(2)}</b></div>}
            {res.reason && <div className="text-white/70">{res.reason}</div>}
            {res.error && <div className="text-red-300">{res.error}</div>}
          </div>
        )}
      </div>
    </section>
  )
}

function SelectPlayer({
  label, value, onChange, options
}:{label:string; value:number|''; onChange:(v:number|'')=>void; options:Player[]}) {
  return (
    <label className="text-xs">
      <div className="mb-1 text-white/60">{label}</div>
      <select value={value} onChange={(e)=>onChange(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2">
        <option value="">—</option>
        {options.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.team} · £{Number(p.price).toFixed(1)}m
          </option>
        ))}
      </select>
    </label>
  )
}
