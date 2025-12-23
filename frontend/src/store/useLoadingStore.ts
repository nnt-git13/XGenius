"use client"

import { create } from "zustand"

interface LoadingState {
  activeRequests: Set<string>
  isLoading: () => boolean
  startLoading: (requestId: string) => void
  stopLoading: (requestId: string) => void
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  activeRequests: new Set<string>(),
  isLoading: () => get().activeRequests.size > 0,
  startLoading: (requestId: string) => {
    set((state) => {
      const newSet = new Set(state.activeRequests)
      newSet.add(requestId)
      return { activeRequests: newSet }
    })
  },
  stopLoading: (requestId: string) => {
    set((state) => {
      const newSet = new Set(state.activeRequests)
      newSet.delete(requestId)
      return { activeRequests: newSet }
    })
  },
}))

