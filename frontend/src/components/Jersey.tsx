import React from 'react'

export default function Jersey({ team, number, size=72 }: { team: string; number?: number; size?: number }) {
  // Map team to jersey color or image
  const teamKits: Record<string,string> = {
    Arsenal: '#EF0107',
    Chelsea: '#034694',
    'Manchester City': '#6CABDD',
    'Manchester United': '#DA291C',
    Newcastle: '#241F20',
    'West Ham': '#7A263A',
    // ...add all PL teams here
  }
  const bg = teamKits[team] || '#444'

  return (
    <div
      style={{
        background: bg,
        width: size,
        height: size * 1.2,
        borderRadius: size * 0.1,
        position: 'relative',
        clipPath: 'polygon(15% 0, 85% 0, 100% 20%, 80% 40%, 80% 100%, 20% 100%, 20% 40%, 0 20%)'
      }}
      className="flex items-center justify-center text-white font-bold"
    >
      {number && <span style={{fontSize: size*0.3}}>{number}</span>}
    </div>
  )
}
