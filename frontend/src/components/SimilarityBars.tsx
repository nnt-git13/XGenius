import React from 'react'
export default function SimilarityBars({ pct=53 }:{ pct:number }){
  const cells = 10, filled = Math.round((pct/100)*cells)
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">{Array.from({length:cells}).map((_,i)=>(
        <div key={i} className={`h-3 w-6 rounded-sm ${i<filled?'bg-green-400':'bg-white/10'}`}/>
      ))}</div>
      <div className="text-sm font-semibold text-green-300">{pct}%</div>
    </div>
  )
}
