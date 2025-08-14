import React, { useEffect, useState } from 'react'
import { newsFeed, type Article } from '../lib/api'
import { Search } from 'lucide-react'

function pillColor(s?: string) {
  if (!s) return 'bg-white/10 text-white/70'
  if (s.startsWith('pos')) return 'bg-green-500/20 text-green-300'
  if (s.startsWith('neg')) return 'bg-red-500/20 text-red-300'
  return 'bg-white/10 text-white/70'
}

export default function NewsPage() {
  const [q, setQ] = useState('')
  const [team, setTeam] = useState('')
  const [items, setItems] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { articles } = await newsFeed({ q, team, limit: 50 })
      setItems(articles)
    } finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ const t=setTimeout(load, 250); return ()=>clearTimeout(t) }, [q, team])

  return (
    <div className="page py-6 space-y-6">
      <h1 className="text-2xl font-semibold">News & Hype</h1>

      <section className="panel">
        <div className="panel-header">
          <div className="font-medium">Latest updates</div>
          <div className="text-xs text-white/60">{items.length} articles</div>
        </div>
        <div className="panel-body space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-2.5 text-white/50"/>
              <input className="pl-7 bg-white/5 border border-white/10 rounded-lg px-3 py-2" placeholder="Search headline or player…"
                     value={q} onChange={e=>setQ(e.target.value)} />
            </div>
            <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2" placeholder="Filter team (e.g., Arsenal)"
                   value={team} onChange={e=>setTeam(e.target.value)} />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {items.map((a, i)=>(
              <a key={a.id || i} href={a.url} target="_blank" rel="noreferrer"
                 className="rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10">
                <div className="text-sm font-medium">{a.title}</div>
                {a.source && <div className="text-[11px] text-white/60 mt-0.5">{a.source} · {a.published_at ? new Date(a.published_at).toLocaleString() : ''}</div>}
                {a.summary && <div className="text-sm text-white/70 mt-2 line-clamp-3">{a.summary}</div>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.sentiment && <span className={`text-[10px] px-2 py-0.5 rounded-md ${pillColor(a.sentiment)}`}>{a.sentiment}</span>}
                  {(a.players || []).slice(0,3).map(p=> <span key={p} className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/70">{p}</span>)}
                  {(a.teams || []).slice(0,2).map(t=> <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/70">{t}</span>)}
                </div>
              </a>
            ))}
            {loading && <div className="text-sm text-white/60 p-3">Loading…</div>}
            {!loading && items.length===0 && <div className="text-sm text-white/60 p-3">No articles</div>}
          </div>
        </div>
      </section>
    </div>
  )
}
