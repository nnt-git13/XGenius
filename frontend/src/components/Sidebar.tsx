import React from 'react'
import { Grid2x2, Eye, Settings2 } from 'lucide-react'
// Old component - using Next.js Link instead
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Item = ({to, icon:Icon}:{to:string; icon: any})=>{
  const pathname = usePathname()
  const active = pathname.startsWith(to)
  return (
    <Link href={to} className={`flex items-center justify-center h-12 w-12 rounded-xl
       ${active ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
      <Icon size={18}/>
    </Link>
  )
}

export default function Sidebar(){
  return (
    <aside className="hidden md:flex flex-col items-center gap-3 p-3">
      <div className="h-12 w-12 grid place-items-center rounded-2xl bg-accent text-black font-bold">⚽</div>
      <div className="flex flex-col gap-2 mt-4">
        <Item to="/my-team" icon={Grid2x2}/>
        <Item to="/score" icon={Eye}/>
        <Item to="/settings" icon={Settings2}/>
      </div>
      <div className="mt-auto opacity-60 text-xs">© XGenius</div>
    </aside>
  )
}
