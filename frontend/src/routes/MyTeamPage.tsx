import React, { useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import MiniRankChart from '../components/MiniRankChart'
import PointsByPosition from '../components/PointsByPosition'
import SimilarityBars from '../components/SimilarityBars'
import Pitch from '../components/Pitch'
import { useSquadStore } from '../state/useSquadStore'
import { seedSampleXI } from '../lib/seedTeam'  // <-- add this import

export default function MyTeamPage() {
  // one store call
  const { formation, squad, season } = useSquadStore()

  // auto-seed a sample XI on first load if empty
  useEffect(() => {
    const empty = squad.every(s => !s.player)
    if (empty) { void seedSampleXI(season) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // run once on mount

  return (
    <div className="min-h-full grid grid-cols-[64px_1fr]">
      <Sidebar />
      <main className="page py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Team</h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-2col gap-6">
          {/* LEFT: analytics */}
          <section className="space-y-6">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="text-sm text-white/60">FC XGenius</div>
                  <div className="text-lg font-semibold">Dashboard</div>
                </div>
                <div className="hidden md:flex gap-6 text-sm">
                  <div><div className="text-white/60">Total Points</div><div className="font-semibold">1965</div></div>
                  <div><div className="text-white/60">Rank</div><div className="font-semibold">12,821</div></div>
                  <div><div className="text-white/60">Old Rank</div><div className="font-semibold">15,223</div></div>
                </div>
              </div>
              <div className="panel-body space-y-4">
                <MiniRankChart points={[900000,600000,420000,500000,350000,280000,200000,220000,180000,160000,140000,170000,150000]} />
                <TopBar />
              </div>
            </div>

            {/* Three compact cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
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
                <div className="panel-body"><SimilarityBars pct={53} /></div>
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
              <div className="panel-body"><PointsByPosition /></div>
            </div>
          </section>

          {/* RIGHT: squad pitch (sticky, compact) */}
          <section className="xl:sticky xl:top-6 h-fit">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="text-sm text-white/60">Gameweek Live</div>
                  <div className="font-medium">XI · {formation}</div>
                </div>
                <div className="text-sm grid grid-cols-3 gap-4">
                  <div><div className="text-white/60">Points</div><div className="font-semibold">78</div></div>
                  <div><div className="text-white/60">Value</div><div className="font-semibold">£104.8</div></div>
                  <div><div className="text-white/60">Overall</div><div className="font-semibold">9,321 <span className="text-green-400">▲</span></div></div>
                </div>
              </div>
              <div className="panel-body">
                <Pitch />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
