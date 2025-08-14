import React from 'react'
export default function Badge({ children }: { children: React.ReactNode }) {
  return <span className="text-xs px-2 py-1 rounded-lg bg-white/10">{children}</span>
}
