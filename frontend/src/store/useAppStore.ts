"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AppState {
  // User preferences
  teamId: number | null
  season: string
  
  // UI state
  theme: "dark" | "light"
  
  // Squad state
  currentSquad: any[] | null
  
  // Actions
  setTeamId: (id: number | null) => void
  setSeason: (season: string) => void
  setTheme: (theme: "dark" | "light") => void
  setCurrentSquad: (squad: any[] | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      teamId: null,
      season: "2024-25",
      theme: "dark",
      currentSquad: null,
      
      setTeamId: (id) => set({ teamId: id }),
      setSeason: (season) => set({ season }),
      setTheme: (theme) => set({ theme }),
      setCurrentSquad: (squad) => set({ currentSquad: squad }),
    }),
    {
      name: "xgenius-storage",
    }
  )
)




