"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Sparkles,
  ChevronRight,
  Zap
} from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import { useAppStore } from "@/store/useAppStore"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  reasoning?: string
  recommendations?: string[]
}

interface SavedChat {
  id: string
  title: string
  messages: Message[]
  conversationId: number | null
  createdAt: Date
}

const quickPrompts = [
  { icon: "👑", text: "Who should I captain this week?" },
  { icon: "🔄", text: "Best transfers for next gameweek?" },
  { icon: "🎯", text: "Rank my forwards for the next 5 GWs" },
  { icon: "💡", text: "Should I use my Free Hit chip?" },
  { icon: "📊", text: "Analyze my team's fixture difficulty" },
  { icon: "⚡", text: "Is it worth taking a -4 hit?" },
]

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [savedChats, setSavedChats] = useState<SavedChat[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const teamId = useAppStore((state) => state.teamId)

  // Load saved chats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("copilot-chats")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSavedChats(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt)
        })))
      } catch (e) {
        console.error("Failed to load saved chats", e)
      }
    }
  }, [])

  // Save chats to localStorage
  useEffect(() => {
    if (savedChats.length > 0) {
      localStorage.setItem("copilot-chats", JSON.stringify(savedChats))
    }
  }, [savedChats])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessageMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await api.askCopilot(question, {
        conversation_id: conversationId || undefined,
        team_id: teamId || undefined,
        route: window.location.pathname,
        app_state: { route: window.location.pathname },
      })
      return response
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.answer || "I've processed your request.",
        reasoning: data.reasoning,
        recommendations: data.recommendations,
      }
      setMessages((prev) => [...prev, assistantMessage])
      if (data.conversation_id) {
        setConversationId(data.conversation_id)
      }
      // Auto-save chat
      autoSaveChat([...messages, assistantMessage])
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

  const autoSaveChat = (msgs: Message[]) => {
    if (msgs.length === 0) return
    
    const firstUserMsg = msgs.find(m => m.role === "user")
    const title = firstUserMsg?.content.slice(0, 40) + (firstUserMsg?.content.length! > 40 ? "..." : "") || "New Chat"
    
    if (activeChat) {
      setSavedChats(prev => prev.map(c => 
        c.id === activeChat ? { ...c, messages: msgs, conversationId } : c
      ))
    } else {
      const newChatId = Date.now().toString()
      setSavedChats(prev => [{
        id: newChatId,
        title,
        messages: msgs,
        conversationId,
        createdAt: new Date()
      }, ...prev])
      setActiveChat(newChatId)
    }
  }

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

  const handleQuickPrompt = (prompt: string) => {
    if (sendMessageMutation.isPending) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
    }
    setMessages((prev) => [...prev, userMessage])
    sendMessageMutation.mutate(prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startNewChat = () => {
    setMessages([])
    setConversationId(null)
    setActiveChat(null)
  }

  const loadChat = (chat: SavedChat) => {
    setMessages(chat.messages)
    setConversationId(chat.conversationId)
    setActiveChat(chat.id)
  }

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSavedChats(prev => prev.filter(c => c.id !== chatId))
    if (activeChat === chatId) {
      startNewChat()
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden flex">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-[#0a0a0f] to-cyan-950/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Sidebar - Saved Chats */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="relative z-20 w-72 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-white/5">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/25"
              >
                <Plus className="h-5 w-5" />
                New Chat
              </button>
            </div>

            {/* Saved Chats List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-2 mb-3">
                Saved Conversations
              </p>
              {savedChats.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No saved chats yet</p>
                  <p className="text-white/30 text-xs mt-1">Your conversations will appear here</p>
                </div>
              ) : (
                savedChats.map((chat) => (
                  <motion.button
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => loadChat(chat)}
                    className={cn(
                      "w-full group flex items-start gap-3 p-3 rounded-xl text-left transition-all",
                      activeChat === chat.id
                        ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      activeChat === chat.id ? "bg-emerald-500/20" : "bg-white/5"
                    )}>
                      <MessageSquare className={cn(
                        "h-4 w-4",
                        activeChat === chat.id ? "text-emerald-400" : "text-white/50"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        activeChat === chat.id ? "text-white" : "text-white/70"
                      )}>
                        {chat.title}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {chat.messages.length} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.button>
                ))
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span>Powered by Llama 3.3 70B</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="relative flex-1 flex flex-col z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all"
            >
              <ChevronRight className={cn(
                "h-5 w-5 transition-transform",
                sidebarOpen ? "rotate-180" : ""
              )} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                <Sparkles className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">AI Copilot</h1>
                <p className="text-xs text-white/50">Your intelligent FPL advisor</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {messages.length === 0 ? (
              /* Welcome Screen */
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh] text-center"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="relative mb-8"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />
                  <div className="relative p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-white/10">
                    <Bot className="h-16 w-16 text-emerald-400" />
                  </div>
                </motion.div>
                
                <h2 className="text-3xl font-bold text-white mb-3">
                  How can I help you today?
                </h2>
                <p className="text-white/50 mb-10 max-w-md">
                  Ask me about transfers, captain picks, chip strategy, or any FPL question.
                </p>

                {/* Quick Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl">
                  {quickPrompts.map((prompt, index) => (
                    <motion.button
                      key={prompt.text}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      onClick={() => handleQuickPrompt(prompt.text)}
                      className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
                    >
                      <span className="text-2xl">{prompt.icon}</span>
                      <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                        {prompt.text}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Chat Messages */
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex gap-4",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                          <Bot className="h-5 w-5 text-emerald-400" />
                        </div>
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-5 py-4",
                        message.role === "user"
                          ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20"
                          : "bg-white/[0.03] border border-white/10 text-white"
                      )}
                    >
                      <div className={cn(
                        "prose max-w-none",
                        message.role === "user" 
                          ? "prose-p:text-white prose-strong:text-white prose-headings:text-white" 
                          : "prose-invert prose-p:text-white/80 prose-strong:text-emerald-400 prose-headings:text-white prose-li:text-white/80"
                      )}>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      
                      {message.recommendations && message.recommendations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Recommendations
                          </p>
                          <ul className="space-y-2">
                            {message.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                <span className="text-emerald-400 mt-1">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Loading State */}
                {sendMessageMutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                        <Bot className="h-5 w-5 text-emerald-400" />
                      </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-white/50 text-sm">Analyzing your request...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-white/5 bg-black/20 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your team, transfers, captaincy..."
                  className="w-full px-5 py-4 pr-14 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all resize-none"
                  rows={1}
                  disabled={sendMessageMutation.isPending}
                  style={{ minHeight: '56px', maxHeight: '200px' }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || sendMessageMutation.isPending}
                className={cn(
                  "p-4 rounded-2xl transition-all flex items-center justify-center",
                  input.trim() && !sendMessageMutation.isPending
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                    : "bg-white/5 text-white/30 cursor-not-allowed"
                )}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-center text-xs text-white/30 mt-3">
              AI can make mistakes. Verify important decisions with official FPL data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
