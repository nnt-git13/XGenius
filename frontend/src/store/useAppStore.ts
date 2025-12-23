"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type AppState = {
  /** FPL Entry ID (aka Team ID). */
  teamId: number | null
  setTeamId: (teamId: number | null) => void
}

// Next.js safety: provide a no-op storage during SSR so importing this module never crashes.
const noopStorage: Storage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
  clear: () => {},
  key: (_index: number) => null,
  get length() {
    return 0
  },
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      teamId: null,
      setTeamId: (teamId) => set({ teamId }),
    }),
    {
      name: "xgenius-app-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noopStorage)),
      version: 1,
    },
  ),
)

