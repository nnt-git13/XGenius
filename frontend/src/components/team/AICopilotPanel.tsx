"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, ChevronUp, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface AICopilotPanelProps {
  selectedPlayer?: any
  className?: string
}

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  selectedPlayer,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(true)
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    const userMsg = query.trim()
    setMessages((m) => [...m, { role: "user", content: userMsg }])
    setQuery("")

    // TODO: wire to backend. For now, simulate a helpful response.
    setTimeout(() => {
      const name = selectedPlayer?.name ? ` about ${selectedPlayer.name}` : ""
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            `Here’s a quick take${name}. ` +
            `I can help with captain picks, bench order, and transfer direction once the full AI endpoint is connected.`,
        },
      ])
      setIsLoading(false)
    }, 900)
  }

  return (
    <div className={cn("overflow-hidden max-w-full", className)}>
      {/* Header (collapsible) */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors xg-focus-ring"
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-ai-accent/35 to-ai-secondary/25 border border-white/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-white font-semibold text-sm leading-tight">XG Copilot</h3>
            <p className="text-white/55 text-xs truncate">
              {isLoading ? "Thinking…" : "Ask for tactics, picks, transfers"}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronUp className="h-4 w-4 text-white/60" />
        </motion.div>
      </motion.button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {/* Quick suggestions */}
              <div className="space-y-2">
                <p className="text-white/70 text-xs font-semibold">Quick actions</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    selectedPlayer?.name ? `Captain: ${selectedPlayer.name}` : "Captain pick",
                    "Optimize XI",
                    "Transfer advice",
                    "Explain bench",
                  ].map((suggestion) => (
                    <motion.button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuery(suggestion)}
                      className="xg-focus-ring px-3 py-1.5 bg-white/5 hover:bg-white/8 rounded-full text-white/80 text-xs border border-white/10 transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="rounded-2xl bg-black/20 border border-white/10 p-3 min-h-[160px]">
                <div className="space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-white/50 text-xs text-center py-10">
                      Ask about your XI, captaincy, or transfers.
                    </p>
                  ) : (
                    messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-snug",
                          m.role === "user"
                            ? "ml-auto bg-ai-primary/15 border border-ai-primary/20 text-white"
                            : "mr-auto bg-white/6 border border-white/10 text-white/90"
                        )}
                      >
                        {m.content}
                      </div>
                    ))
                  )}

                  {isLoading && (
                    <div className="mr-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/6 border border-white/10 text-white/70 text-sm">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:120ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:240ms]" />
                      </span>
                      Thinking…
                    </div>
                  )}
                </div>
              </div>

              {/* Input form */}
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask XGenius anything about your team..."
                    className="xg-focus-ring w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    disabled={isLoading || !query.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

