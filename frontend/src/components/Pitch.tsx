import React from 'react'
import ShirtCard from './ShirtCard'
import { useSquadStore, type SquadSlot } from '../state/useSquadStore'

const FORM: Record<string, ('GK'|'DEF'|'MID'|'FWD')[][]> = {
  '3-4-3': [['GK'],['DEF','DEF','DEF'],['MID','MID','MID','MID'],['FWD','FWD','FWD']],
  '4-4-2': [['GK'],['DEF','DEF','DEF','DEF'],['MID','MID','MID','MID'],['FWD','FWD']],
  '4-3-3': [['GK'],['DEF','DEF','DEF','DEF'],['MID','MID','MID'],['FWD','FWD','FWD']],
  '3-5-2': [['GK'],['DEF','DEF','DEF'],['MID','MID','MID','MID','MID'],['FWD','FWD']],
}

export default function Pitch(){
  const { formation, squad, bench, removeFromBench } = useSquadStore()
  const rows = FORM[formation] ?? FORM['3-4-3']
  const used = Array(squad.length).fill(false)
  const take = (pos: SquadSlot['pos'])=>{
    const idx = squad.findIndex((s,i)=>!used[i] && s.pos===pos); if(idx>=0) used[idx]=true; return idx
  }

  return (
    <div className="space-y-4">
      <div className="pitch">
        <div className="pitch-inner">
          <div className="pitch-grid">
            {rows.map((line,i)=>(
              <div key={i} className="pitch-row">
                {line.map((pos,j)=>{
                  const idx = take(pos)
                  return idx===-1
                    ? <div key={`${i}-${j}`} className="shirt-card min-w-[120px] text-white/40">{pos} Empty</div>
                    : <ShirtCard key={idx} slot={squad[idx]} index={idx} gwPoints={0}/>
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bench INSIDE the card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-white/60 mb-2">Bench</div>
        <div className="flex gap-3">
          {bench.map((b,i)=>(
            <div key={i} className="shirt-card min-w-[120px]">
              {b.player ? (
                <>
                  <div className="text-[11px] text-white/60 mb-1">BEN</div>
                  <ShirtCard slot={{pos:b.player.position, player:b.player}} index={-1} gwPoints={0}/>
                  <button className="mt-2 w-full text-xs bg-white/10 rounded-md py-1 hover:bg-white/20"
                          onClick={()=>removeFromBench(i)}>Remove</button>
                </>
              ) : <div className="text-white/40 text-xs">Empty</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
