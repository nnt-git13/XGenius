"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ActionCard } from "./ActionCard"
import { ToolStatusIndicator } from "./ToolStatusIndicator"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import { useAppStore } from "@/store/useAppStore"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Array<{ type: string; id: string; title: string }>
  actions?: Array<{
    id: number
    tool_name: string
    status: string
    preview?: any
    requires_confirmation: boolean
  }>
  timestamp: Date
}

export const CopilotChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [conversationId, setConversationId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const teamId = useAppStore((state) => state.teamId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.askCopilot(message, {
        conversation_id: conversationId || undefined,
        team_id: teamId || undefined,
        route: window.location.pathname,
        app_state: {
          route: window.location.pathname,
        },
      })
      return response
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.answer || "I've processed your request.",
        sources: data.sources || [],
        actions: data.actions || [],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      if (data.conversation_id) {
        setConversationId(data.conversation_id)
      }
    },
    onError: (error) => {
      console.error("Copilot error:", error)
      // Show error message to user
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again or check your connection.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    },
  })

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    sendMessageMutation.mutate(input.trim())
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-ai-darker">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-full bg-gradient-to-br from-ai-accent/20 to-ai-primary/20 mb-4"
            >
              <Sparkles className="h-12 w-12 text-ai-accent" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">AI Copilot</h3>
            <p className="text-white/70 mb-6 max-w-md">
              Ask me anything about your FPL team, transfers, captaincy, or strategy.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-ai-accent to-ai-primary flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg p-4 break-words",
                    message.role === "user"
                      ? "bg-ai-primary text-black"
                      : "glass border border-ai-primary/20 text-white"
                  )}
                >
                  <div className="prose prose-invert max-w-none break-words">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-ai-primary font-semibold mb-2">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded bg-ai-primary/10 text-ai-primary"
                          >
                            {source.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tool Status Indicators */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-ai-primary font-semibold mb-2">Tools Used:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.actions.map((action) => (
                          <ToolStatusIndicator
                            key={action.id}
                            toolName={action.tool_name}
                            status={action.status as any}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {message.actions.map((action) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          onConfirm={async () => {
                            // Handle action confirmation
                            const response = await fetch(
                              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/copilot/actions/${action.id}/confirm`,
                              { method: "POST" }
                            )
                            if (response.ok) {
                              // Refresh or update UI
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-white/50 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ai-primary flex items-center justify-center">
                    <User className="h-5 w-5 text-black" />
                  </div>
                )}
              </motion.div>
            ))}
            {sendMessageMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-ai-accent to-ai-primary flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="glass border border-ai-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-ai-primary" />
                    <span className="text-white/70">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-ai-primary/20">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your team, transfers, captaincy..."
            className="flex-1 glass rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-ai-primary border border-ai-primary/20 resize-none"
            rows={1}
            disabled={sendMessageMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessageMutation.isPending}
            className="px-4 py-3 bg-gradient-to-r from-ai-primary to-ai-secondary text-black font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

