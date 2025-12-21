"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type WishlistPos = "GK" | "DEF" | "MID" | "FWD"

export type WishlistItem = {
  id: number
  position: WishlistPos
  addedAt: number
}

type WishlistState = {
  items: WishlistItem[]
  add: (item: { id: number; position: WishlistPos }) => void
  remove: (id: number) => void
  toggle: (item: { id: number; position: WishlistPos }) => void
  has: (id: number) => boolean
  idsForPosition: (position: WishlistPos) => number[]
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

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      add: ({ id, position }) =>
        set((state) => {
          if (state.items.some((x) => x.id === id)) return state
          return { items: [{ id, position, addedAt: Date.now() }, ...state.items] }
        }),

      remove: (id) => set((state) => ({ items: state.items.filter((x) => x.id !== id) })),

      toggle: ({ id, position }) => {
        const exists = get().items.some((x) => x.id === id)
        if (exists) get().remove(id)
        else get().add({ id, position })
      },

      has: (id) => get().items.some((x) => x.id === id),

      idsForPosition: (position) =>
        get()
          .items.filter((x) => x.position === position)
          .sort((a, b) => b.addedAt - a.addedAt)
          .map((x) => x.id),
    }),
    {
      name: "xgenius-wishlist-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noopStorage)),
      version: 1,
    },
  ),
)


