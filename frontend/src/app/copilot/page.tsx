"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Loader2, Sparkles, MessageSquare } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  reasoning?: string
  recommendations?: string[]
}

const quickPrompts = [
  "Rank my forwards for the next 5 gameweeks",
  "Should I use my Free Hit chip?",
  "Who should I captain this week?",
  "Is it worth taking a -4 hit?",
  "Analyze my team's fixture difficulty",
]

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessageMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await api.askCopilot(question)
      return response
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.answer || data.response || "I've processed your request.",
        timestamp: new Date(),
        reasoning: data.reasoning,
        recommendations: data.recommendations,
      }
      setMessages((prev) => [...prev, assistantMessage])
    },
    onError: (error) => {
      console.error("Copilot error:", error)
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

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-ai-darker relative overflow-hidden flex flex-col">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/ai.mp4" type="video/mp4" />
        </video>
        {/* Overlay for better content readability */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-premier opacity-20" />
      </div>

      <div className="relative flex-1 container mx-auto px-4 py-8 flex flex-col max-w-6xl z-10">
        {/* Header */}
        <SectionHeader
          title="AI Copilot"
          subtitle="Your intelligent FPL advisor powered by AI"
          className="mb-6"
        />

        {/* Chat Container */}
        <GlassCard glow className="flex-1 flex flex-col min-h-0 mb-4">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-4 rounded-full bg-gradient-to-br from-ai-accent/20 to-ai-primary/20 mb-4"
                >
                  <Bot className="h-12 w-12 text-ai-accent" />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Welcome to AI Copilot
                </h3>
                <p className="text-white/70 mb-6 max-w-md">
                  Ask me anything about your FPL team, transfers, captaincy, or strategy.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {quickPrompts.map((prompt, index) => (
                    <motion.button
                      key={prompt}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="text-left p-3 rounded-lg glass border border-ai-primary/20 hover:border-ai-primary/50 transition-all text-white/80 hover:text-white break-words overflow-wrap-anywhere"
                    >
                      {prompt}
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
                    transition={{ delay: index * 0.05 }}
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
                        "max-w-[80%] sm:max-w-[85%] rounded-lg p-4 break-words overflow-wrap-anywhere",
                        message.role === "user"
                          ? "bg-ai-primary text-black"
                          : "glass border border-ai-primary/20 text-white"
                      )}
                    >
                      <div className="prose prose-invert max-w-none break-words overflow-wrap-anywhere">
                        <ReactMarkdown className="break-words">{message.content}</ReactMarkdown>
                      </div>
                      {message.reasoning && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-sm text-ai-primary font-semibold mb-1">Reasoning:</p>
                          <p className="text-sm text-white/80">{message.reasoning}</p>
                        </div>
                      )}
                      {message.recommendations && message.recommendations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-sm text-ai-primary font-semibold mb-2">Recommendations:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {message.recommendations.map((rec, i) => (
                              <li key={i} className="text-sm text-white/80">{rec}</li>
                            ))}
                          </ul>
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
                        <span className="text-white/70">AI Copilot is thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-ai-primary/20">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your team, transfers, captaincy, or strategy..."
                className="flex-1 glass rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-ai-primary border border-ai-primary/20 resize-none"
                rows={1}
                disabled={sendMessageMutation.isPending}
              />
              <AnimatedButton
                onClick={handleSend}
                disabled={!input.trim() || sendMessageMutation.isPending}
                variant="primary"
                glow
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </AnimatedButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
