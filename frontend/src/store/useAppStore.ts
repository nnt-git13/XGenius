"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

interface AppState {
  /** FPL Team ID */
  teamId: number | null
  /** Set the FPL Team ID */
  setTeamId: (id: number | null) => void
}

// SSR-safe storage
const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  get length() { return 0 },
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      teamId: null,
      setTeamId: (id) => set({ teamId: id }),
    }),
    {
      name: "xgenius-app-v1",
      storage: createJSONStorage(() => 
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
    }
  )
)
