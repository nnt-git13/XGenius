"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export interface PendingTransferPlayer {
  id: number
  fpl_id: number
  name: string
  position: "GK" | "DEF" | "MID" | "FWD"
  team: string
  team_short_name?: string
  price: number
  total_points: number
  goals_scored: number
  assists: number
  form?: number
  ep_next?: number
}

interface TransferState {
  /** Player selected for transfer in from transfers page */
  pendingTransferIn: PendingTransferPlayer | null
  /** Set the pending transfer in player */
  setPendingTransferIn: (player: PendingTransferPlayer | null) => void
  /** Clear the pending transfer */
  clearPendingTransfer: () => void
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

export const useTransferStore = create<TransferState>()(
  persist(
    (set) => ({
      pendingTransferIn: null,
      setPendingTransferIn: (player) => set({ pendingTransferIn: player }),
      clearPendingTransfer: () => set({ pendingTransferIn: null }),
    }),
    {
      name: "xgenius-transfer-v1",
      storage: createJSONStorage(() => 
        typeof window !== "undefined" ? window.sessionStorage : noopStorage
      ),
    }
  )
)

