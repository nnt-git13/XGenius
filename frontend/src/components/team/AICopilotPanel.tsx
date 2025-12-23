"use client"

import React, { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/useAppStore"

interface AICopilotPanelProps {
  selectedPlayer?: any
  className?: string
  /** When embedded, the outer wrapper provides the header/collapse control. */
  embedded?: boolean
  /** Optional prompt to prefill into the input (used by quick-action chips). */
  prefillPrompt?: string | null
  onPrefillConsumed?: () => void
}

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  selectedPlayer,
  className,
  embedded = false,
  prefillPrompt = null,
  onPrefillConsumed,
}) => {
  const { teamId } = useAppStore()
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])

  useEffect(() => {
    if (prefillPrompt && prefillPrompt.trim()) {
      setQuery(prefillPrompt)
      onPrefillConsumed?.()
    }
  }, [prefillPrompt, onPrefillConsumed])

  const suggestionChips = useMemo(() => {
    const name = selectedPlayer?.name ? String(selectedPlayer.name) : null
    if (name) {
      return [
        `Explain ${name}'s role and what to expect next GW`,
        `Should I captain ${name}? Give pros/cons`,
        `If I sell ${name}, who are 3 smarter replacements and why?`,
        `Explain my bench order and one tweak`,
      ]
    }
    return [
      "Explain my bench order and one tweak",
      "Who should I captain and why?",
      "Which position should I transfer this week?",
      "Summarize my biggest risks for the upcoming GW",
    ]
  }, [selectedPlayer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    const userMsg = query.trim()
    setMessages((m) => [...m, { role: "user", content: userMsg }])
    setQuery("")

    try {
      const res = await api.askCopilot(userMsg, {
        team_id: teamId ?? undefined,
        route: typeof window !== "undefined" ? window.location.pathname : "/team",
        app_state: {
          selected_player: selectedPlayer ? { id: selectedPlayer.id, name: selectedPlayer.name } : null,
        },
      })
      const assistantText =
        (res && (res.reply || res.message || res.answer || res.content)) ??
        (typeof res === "string" ? res : null) ??
        "Got it. What would you like me to optimize first—captaincy, bench, or transfers?"

      setMessages((m) => [...m, { role: "assistant", content: String(assistantText) }])
    } catch (err: any) {
      const fallback =
        "I couldn’t reach the Copilot backend right now. Try again in a moment, or start the backend server."
      setMessages((m) => [...m, { role: "assistant", content: fallback }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("overflow-hidden max-w-full", className)}>
      {/* Embedded mode shows only the chat body (outer wrapper controls header/collapse). */}
      <div className={cn(!embedded && "pt-3", "space-y-3")}>
        {/* Suggestions (different from the top quick-action pills in the wrapper) */}
        <div className="space-y-2">
          <p className="text-white/70 text-xs font-semibold">Suggested prompts</p>
          <div className="flex flex-wrap gap-2">
            {suggestionChips.map((suggestion) => (
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
    </div>
  )
}

