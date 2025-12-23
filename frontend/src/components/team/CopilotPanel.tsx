"use client"

import React, { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Sparkles, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { AICopilotPanel } from "./AICopilotPanel"

interface CopilotPanelProps {
  selectedPlayer?: any
  className?: string
}

export function CopilotPanel({ selectedPlayer, className }: CopilotPanelProps) {
  const [open, setOpen] = useState(false)
  const [prefill, setPrefill] = useState<string | null>(null)

  const quickActions = useMemo(() => {
    const name = selectedPlayer?.name ? String(selectedPlayer.name) : null
    return [
      "Optimize XI",
      name ? `Captain pick for ${name}` : "Captain pick",
      name ? `Transfer advice for ${name}` : "Transfer advice",
      "Explain bench",
    ]
  }, [selectedPlayer])

  return (
    <div className={cn("glass xg-noise rounded-2xl border border-white/10 shadow-xg-card overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between border-b border-white/10 hover:bg-white/5 transition-colors xg-focus-ring"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-ai-primary/30 via-ai-secondary/25 to-ai-accent/25 border border-white/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold leading-tight">XG Copilot</div>
            <div className="text-white/55 text-xs">Advice, explanations, quick actions</div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ai-primary shadow-[0_0_16px_rgba(0,255,133,0.55)]" />
            Online
          </span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronUp className="h-4 w-4 text-white/60" />
          </motion.div>
        </div>
      </button>

      {open && (
        <div className="p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {quickActions.map((t) => (
              <motion.button
                key={t}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPrefill(t)}
                className="xg-focus-ring px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs hover:bg-white/8"
              >
                {t}
              </motion.button>
            ))}
          </div>

          <AICopilotPanel
            embedded
            selectedPlayer={selectedPlayer}
            prefillPrompt={prefill}
            onPrefillConsumed={() => setPrefill(null)}
            className="bg-transparent shadow-none border-0"
          />
        </div>
      )}
    </div>
  )
}


