"use client"

import React from "react"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { AICopilotPanel } from "./AICopilotPanel"

interface CopilotPanelProps {
  selectedPlayer?: any
  className?: string
}

export function CopilotPanel({ selectedPlayer, className }: CopilotPanelProps) {
  return (
    <div className={cn("glass xg-noise rounded-2xl border border-white/10 shadow-xg-card overflow-hidden", className)}>
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-ai-primary/30 via-ai-secondary/25 to-ai-accent/25 border border-white/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold leading-tight">XG Copilot</div>
            <div className="text-white/55 text-xs">Advice, explanations, quick actions</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ai-primary shadow-[0_0_16px_rgba(0,255,133,0.55)]" />
            Online
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {["Optimize XI", "Captain pick", "Transfer advice", "Explain bench"].map((t) => (
            <motion.button
              key={t}
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="xg-focus-ring px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs hover:bg-white/8"
            >
              {t}
            </motion.button>
          ))}
        </div>

        {/* Keep existing behavior, upgraded wrapper */}
        <AICopilotPanel selectedPlayer={selectedPlayer} className="bg-transparent shadow-none border-0" />
      </div>
    </div>
  )
}


