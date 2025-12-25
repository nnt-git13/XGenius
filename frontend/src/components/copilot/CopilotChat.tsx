"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Loader2, Sparkles, ArrowRight } from "lucide-react"
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
}

interface CopilotChatProps {
  compact?: boolean
}

export const CopilotChat: React.FC<CopilotChatProps> = ({ compact = false }) => {
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
    mutationKey: ["copilot-chat"],  // Exclude from global loading overlay
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
      }
      setMessages((prev) => [...prev, assistantMessage])
      if (data.conversation_id) {
        setConversationId(data.conversation_id)
      }
    },
    onError: (error) => {
      console.error("Copilot error:", error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again.",
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
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    sendMessageMutation.mutate(input.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    if (sendMessageMutation.isPending) return
    setInput(prompt)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
    }
    setMessages((prev) => [...prev, userMessage])
    sendMessageMutation.mutate(prompt)
  }

  const quickPrompts = compact
    ? [
        "Who should I captain?",
        "Best transfers?",
        "Team analysis",
      ]
    : [
        "Who should I captain this week?",
        "What transfers should I make?",
        "Analyze my team",
      ]

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className={cn(
        "flex-1 overflow-y-auto space-y-3",
        compact ? "p-3" : "p-4"
      )}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "rounded-2xl mb-4 relative overflow-hidden",
                compact ? "p-3" : "p-4"
              )}
              style={{
                background: "linear-gradient(135deg, rgba(0, 255, 133, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)",
                border: "1px solid rgba(0, 255, 133, 0.2)",
              }}
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute inset-0 opacity-20"
                style={{
                  background: "conic-gradient(from 0deg, transparent, #00ff85, transparent)",
                }}
              />
              <Sparkles className={cn(
                "text-[#00ff85] relative z-10",
                compact ? "h-8 w-8" : "h-10 w-10"
              )} />
            </motion.div>
            
            <h3 className={cn(
              "font-bold text-white mb-1",
              compact ? "text-base" : "text-lg"
            )}>
              How can I help?
            </h3>
            <p className={cn(
              "text-white/50 mb-4 max-w-xs",
              compact ? "text-xs" : "text-sm"
            )}>
              Ask me about your team, transfers, or strategy
            </p>
            
            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2 justify-center">
              {quickPrompts.map((prompt, i) => (
                <motion.button
                  key={prompt}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleQuickPrompt(prompt)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full transition-all duration-200 group",
                    compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                  )}
                  style={{
                    background: "rgba(0, 255, 133, 0.05)",
                    border: "1px solid rgba(0, 255, 133, 0.2)",
                  }}
                >
                  <span className="text-white/80 group-hover:text-white transition-colors">
                    {prompt}
                  </span>
                  <ArrowRight className="h-3 w-3 text-[#00ff85] opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index === messages.length - 1 ? 0 : 0 }}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div 
                    className={cn(
                      "flex-shrink-0 rounded-lg flex items-center justify-center",
                      compact ? "w-7 h-7" : "w-8 h-8"
                    )}
                    style={{
                      background: "linear-gradient(135deg, rgba(0, 255, 133, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)",
                      border: "1px solid rgba(0, 255, 133, 0.3)",
                    }}
                  >
                    <Bot className={cn(
                      "text-[#00ff85]",
                      compact ? "h-4 w-4" : "h-5 w-5"
                    )} />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl break-words",
                    compact ? "p-3 text-sm" : "p-4",
                    message.role === "user"
                      ? "text-black"
                      : "text-white"
                  )}
                  style={message.role === "user" ? {
                    background: "linear-gradient(135deg, #00ff85 0%, #06b6d4 100%)",
                    boxShadow: "0 4px 15px rgba(0, 255, 133, 0.2)",
                  } : {
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className={cn(
                    "prose max-w-none break-words",
                    message.role === "user" ? "prose-invert-user" : "prose-invert",
                    compact && "text-sm"
                  )}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className={cn(
                          "mb-2 last:mb-0",
                          message.role === "user" ? "text-black font-medium" : "text-white/90"
                        )}>{children}</p>,
                        strong: ({ children }) => <strong className={cn(
                          "font-bold",
                          message.role === "user" ? "text-black" : "text-[#00ff85]"
                        )}>{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                        li: ({ children }) => <li className="text-white/80">{children}</li>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-[#00ff85] font-semibold mb-2">Sources:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {message.sources.map((source, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded-full bg-[#00ff85]/10 text-[#00ff85] border border-[#00ff85]/20"
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
                      <div className="flex flex-wrap gap-1.5">
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
                    <div className="mt-3 space-y-2">
                      {message.actions.map((action) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          onConfirm={async () => {
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
                </div>
                
                {message.role === "user" && (
                  <div 
                    className={cn(
                      "flex-shrink-0 rounded-lg flex items-center justify-center",
                      compact ? "w-7 h-7" : "w-8 h-8"
                    )}
                    style={{
                      background: "linear-gradient(135deg, #00ff85 0%, #06b6d4 100%)",
                    }}
                  >
                    <User className={cn(
                      "text-black",
                      compact ? "h-4 w-4" : "h-5 w-5"
                    )} />
                  </div>
                )}
              </motion.div>
            ))}
            
            {/* Loading state */}
            {sendMessageMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <div 
                  className={cn(
                    "flex-shrink-0 rounded-lg flex items-center justify-center",
                    compact ? "w-7 h-7" : "w-8 h-8"
                  )}
                  style={{
                    background: "linear-gradient(135deg, rgba(0, 255, 133, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)",
                    border: "1px solid rgba(0, 255, 133, 0.3)",
                  }}
                >
                  <Bot className={cn(
                    "text-[#00ff85]",
                    compact ? "h-4 w-4" : "h-5 w-5"
                  )} />
                </div>
                <div 
                  className={cn(
                    "rounded-xl",
                    compact ? "p-3" : "p-4"
                  )}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                          className="w-2 h-2 rounded-full bg-[#00ff85]"
                        />
                      ))}
                    </div>
                    <span className="text-white/50 text-sm">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={cn(
        "border-t border-white/5",
        compact ? "p-3" : "p-4"
      )}>
        <div className="flex gap-2">
          <div 
            className="flex-1 relative rounded-xl overflow-hidden"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(0, 255, 133, 0.15)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={compact ? "Ask anything..." : "Ask about your team, transfers, captaincy..."}
              className={cn(
                "w-full bg-transparent text-white placeholder-white/30 focus:outline-none resize-none",
                compact ? "px-3 py-2.5 text-sm" : "px-4 py-3"
              )}
              rows={1}
              disabled={sendMessageMutation.isPending}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || sendMessageMutation.isPending}
            className={cn(
              "rounded-xl flex items-center justify-center font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed",
              compact ? "w-10 h-10" : "px-4 py-3"
            )}
            style={{
              background: input.trim() && !sendMessageMutation.isPending
                ? "linear-gradient(135deg, #00ff85 0%, #06b6d4 100%)"
                : "rgba(255, 255, 255, 0.05)",
              boxShadow: input.trim() && !sendMessageMutation.isPending
                ? "0 4px 15px rgba(0, 255, 133, 0.3)"
                : "none",
            }}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className={cn(
                "animate-spin",
                compact ? "h-4 w-4 text-white/50" : "h-5 w-5 text-white/50"
              )} />
            ) : (
              <Send className={cn(
                compact ? "h-4 w-4" : "h-5 w-5",
                input.trim() ? "text-black" : "text-white/30"
              )} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
