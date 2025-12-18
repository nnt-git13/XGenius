"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Command, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Command {
  id: string
  label: string
  description: string
  action: () => void
  category: string
}

interface CopilotCommandBarProps {
  onSelect?: (command: Command) => void
  commands?: Command[]
}

/**
 * Command bar (⌘K) for quick copilot actions
 */
export const CopilotCommandBar: React.FC<CopilotCommandBarProps> = ({
  onSelect,
  commands = [],
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Default commands
  const defaultCommands: Command[] = [
    {
      id: "optimize-squad",
      label: "Optimize Squad",
      description: "Optimize your squad for upcoming gameweeks",
      action: () => {
        onSelect?.(defaultCommands[0])
        setIsOpen(false)
      },
      category: "actions",
    },
    {
      id: "analyze-team",
      label: "Analyze Team",
      description: "Get detailed analysis of your current team",
      action: () => {
        onSelect?.(defaultCommands[1])
        setIsOpen(false)
      },
      category: "analysis",
    },
    {
      id: "transfer-advice",
      label: "Transfer Advice",
      description: "Get advice on potential transfers",
      action: () => {
        onSelect?.(defaultCommands[2])
        setIsOpen(false)
      },
      category: "advice",
    },
  ]

  const allCommands = [...defaultCommands, ...commands]

  const filteredCommands = allCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  )

  // Keyboard shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
        setSearch("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Command Bar */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
            >
              <div className="glass rounded-2xl shadow-2xl border border-ai-primary/20 overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-ai-primary/20">
                  <Search className="h-5 w-5 text-ai-primary flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type a command or ask a question..."
                    className="flex-1 bg-transparent text-white placeholder-white/50 focus:outline-none"
                  />
                  <kbd className="px-2 py-1 text-xs rounded bg-ai-light border border-ai-primary/20 text-white/70">
                    ESC
                  </kbd>
                </div>

                {/* Commands List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredCommands.length === 0 ? (
                    <div className="p-8 text-center text-white/50">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No commands found</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredCommands.map((command, index) => (
                        <motion.button
                          key={command.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={command.action}
                          className="w-full text-left p-3 rounded-lg hover:bg-ai-light/50 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white group-hover:text-ai-primary transition-colors">
                                {command.label}
                              </p>
                              <p className="text-xs text-white/50 mt-0.5 truncate">
                                {command.description}
                              </p>
                            </div>
                            <span className="text-xs text-white/30 capitalize ml-2">
                              {command.category}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

