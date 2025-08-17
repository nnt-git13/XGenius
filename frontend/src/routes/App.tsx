import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import MyTeamPage from './MyTeamPage'
import AssistantPage from './AssistantPage'
import NewsPage from './NewsPage'
import ScoreEvalPage from './ScoreEvalPage'

export default function App() {
  return (
    <div className="bg-app">
      {/* Top Nav - glassy and wider */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="page h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold">
            XGenius <span>⚽</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-white/70">
            <NavLink to="/" className={({isActive})=>isActive?'text-white':'hover:text-white'}>My Team</NavLink>
            <NavLink to="/assistant" className={({isActive})=>isActive?'text-white':'hover:text-white'}>LLM</NavLink>
            <NavLink to="/score-eval" className={({isActive})=>isActive?'text-white':'hover:text-white'}>Score Eval</NavLink>
            <NavLink to="/news" className={({isActive})=>isActive?'text-white':'hover:text-white'}>News</NavLink>
          </nav>
        </div>
      </header>

      {/* Routed pages */}
      <div className="page py-8">
        <Routes>
          <Route path="/" element={<MyTeamPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/score-eval" element={<ScoreEvalPage />} />
          <Route path="/news" element={<NewsPage />} />
        </Routes>
      </div>
    </div>
  )
}
