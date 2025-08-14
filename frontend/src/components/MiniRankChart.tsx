import React from 'react'
export default function MiniRankChart({ points }:{ points:number[] }){
  if(points.length===0) points=[50,60,45,40,55,48,44,49]
  const w=620,h=220,pad=24
  const max=Math.max(...points), min=Math.min(...points)
  const scaleX=(i:number)=> pad + (i*(w-2*pad))/(points.length-1)
  const scaleY=(v:number)=> h-pad - ((v-min)*(h-2*pad))/(max-min||1)
  const d=points.map((v,i)=>`${i===0?'M':'L'} ${scaleX(i)},${scaleY(v)}`).join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="rounded-xl bg-white/5 border border-white/10">
      <path d={d} fill="none" stroke="#3EF08E" strokeWidth="2"/>
      {points.map((v,i)=>(
        <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r="2.5" fill="#3EF08E"/>
      ))}
    </svg>
  )
}
