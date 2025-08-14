import React from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import AssistantPage from './AssistantPage'
import MyTeamPage from './MyTeamPage'
import ScoreEvalPage from './ScoreEvalPage'
import NewsPage from './NewsPage'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <header className="sticky top-0 z-20 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-xl font-bold">XGenius ⚽</div>
          <nav className="flex gap-1">
            <NavLink className={({isActive})=>`nav-link ${isActive?'bg-white/15':''}`} to="/assistant">LLM</NavLink>
            <NavLink className={({isActive})=>`nav-link ${isActive?'bg-white/15':''}`} to="/team">My Team</NavLink>
            <NavLink className={({isActive})=>`nav-link ${isActive?'bg-white/15':''}`} to="/scores">Score Eval</NavLink>
            <NavLink className={({isActive})=>`nav-link ${isActive?'bg-white/15':''}`} to="/news">News</NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<MyTeamPage/>} />
          <Route path="/assistant" element={<AssistantPage/>} />
          <Route path="/my-team" element={<MyTeamPage/>} />
          <Route path="/score" element={<ScoreEvalPage/>} />
          <Route path="/news" element={<NewsPage/>} />
        </Routes>
      </main>
    </div>
  )
}
