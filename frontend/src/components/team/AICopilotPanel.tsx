"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, ChevronDown, ChevronUp, Send, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/Card"
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
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    // TODO: Implement AI query
    setTimeout(() => {
      setIsLoading(false)
      setQuery("")
    }, 2000)
  }

  return (
    <Card variant="glass" className={cn("overflow-hidden max-w-full", className)}>
      {/* Header */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-bold text-sm">AI Copilot</h3>
            <p className="text-white/60 text-xs">Ask XGenius anything</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
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
            <div className="p-4 space-y-4 border-t border-white/10">
              {/* Quick suggestions */}
              {selectedPlayer && (
                <div className="space-y-2">
                  <p className="text-white/70 text-xs font-semibold">Quick Questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      `Should I captain ${selectedPlayer.name}?`,
                      `What are ${selectedPlayer.name}'s upcoming fixtures?`,
                      `Is ${selectedPlayer.name} worth the price?`,
                    ].map((suggestion, index) => (
                      <motion.button
                        key={index}
                        onClick={() => setQuery(suggestion)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 text-xs border border-white/10 transition-colors break-words max-w-full overflow-wrap-anywhere"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="break-words">{suggestion}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input form */}
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask XGenius anything about your team..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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

              {/* Response area */}
              <div className="min-h-[100px] bg-black/20 rounded-lg p-3 border border-white/10">
                <p className="text-white/50 text-xs text-center">
                  {selectedPlayer
                    ? `Ask about ${selectedPlayer.name} or your team strategy`
                    : "Select a player or ask about your team"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

