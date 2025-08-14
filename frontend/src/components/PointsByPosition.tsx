import React from 'react'
export default function PointsByPosition({ gk=141, def=365, mid=420, fwd=322 }:{
  gk?:number; def?:number; mid?:number; fwd?:number
}){
  const max = Math.max(gk,def,mid,fwd)
  const Bar=({v,label,color}:{v:number;label:string;color:string})=>(
    <div className="flex flex-col items-center">
      <div className="h-28 w-10 bg-white/10 rounded-md overflow-hidden flex items-end">
        <div className="w-full rounded-md" style={{height:`${(v/max)*100}%`, background:color}}/>
      </div>
      <div className="text-[10px] mt-1 text-white/60">{label}</div>
    </div>
  )
  return (
    <div className="flex gap-4">
      <Bar v={gk} label="GK"  color="rgba(62,240,142,0.9)"/>
      <Bar v={def} label="DEF" color="rgba(62,185,240,0.9)"/>
      <Bar v={mid} label="MID" color="rgba(125,91,255,0.9)"/>
      <Bar v={fwd} label="FWD" color="rgba(255,127,80,0.9)"/>
    </div>
  )
}
