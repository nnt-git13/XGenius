import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import OptimizerPage from './OptimizerPage'
import AssistantPage from './AssistantPage'
import MyTeamPage from './MyTeamPage'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Top Nav - glassy and wider */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            XGenius <span className="text-white">⚽</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <NavLink 
              to="/" 
              className={({isActive}) => 
                isActive 
                  ? 'text-white font-semibold border-b-2 border-purple-400 pb-1' 
                  : 'text-gray-400 hover:text-white transition-colors'
              }
            >
              Dashboard
            </NavLink>
            <NavLink 
              to="/optimizer" 
              className={({isActive}) => 
                isActive 
                  ? 'text-white font-semibold border-b-2 border-purple-400 pb-1' 
                  : 'text-gray-400 hover:text-white transition-colors'
              }
            >
              Optimizer
            </NavLink>
            <NavLink 
              to="/assistant" 
              className={({isActive}) => 
                isActive 
                  ? 'text-white font-semibold border-b-2 border-purple-400 pb-1' 
                  : 'text-gray-400 hover:text-white transition-colors'
              }
            >
              Assistant
            </NavLink>
            <NavLink 
              to="/team" 
              className={({isActive}) => 
                isActive 
                  ? 'text-white font-semibold border-b-2 border-purple-400 pb-1' 
                  : 'text-gray-400 hover:text-white transition-colors'
              }
            >
              My Team
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Routed pages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/optimizer" element={<OptimizerPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/team" element={<MyTeamPage />} />
        </Routes>
      </div>
    </div>
  )
}
