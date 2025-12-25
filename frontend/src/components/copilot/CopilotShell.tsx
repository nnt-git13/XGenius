"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Minimize2, Maximize2, Bot, Sparkles, Zap } from "lucide-react"
import { CopilotChat } from "./CopilotChat"
import { cn } from "@/lib/utils"

interface CopilotShellProps {
  defaultOpen?: boolean
  position?: "right" | "left" | "floating"
  onClose?: () => void
}

/**
 * Main copilot shell - beautiful floating design
 */
export const CopilotShell: React.FC<CopilotShellProps> = ({
  defaultOpen = false,
  position = "right",
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isMinimized, setIsMinimized] = useState(false)

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all group overflow-hidden"
        aria-label="Open Copilot"
        style={{
          background: "linear-gradient(135deg, #00ff85 0%, #06b6d4 50%, #8b5cf6 100%)",
          boxShadow: "0 0 40px rgba(0, 255, 133, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Animated inner glow */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
          }}
        />
        <Bot className="h-7 w-7 text-black relative z-10" />
        
        {/* Pulse ring */}
        <motion.div
          animate={{
            scale: [1, 1.5],
            opacity: [0.4, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute inset-0 rounded-full border-2 border-[#00ff85]"
        />
      </motion.button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden",
          position === "right" && "right-0 top-0 h-screen w-[440px] max-w-[90vw]",
          position === "left" && "left-0 top-0 h-screen w-[440px] max-w-[90vw]",
          position === "floating" && "bottom-6 right-6 w-[400px] h-[550px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-48px)] rounded-2xl",
          isMinimized && "h-auto"
        )}
        style={{
          background: "linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(0, 0, 0, 0.95) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0, 255, 133, 0.15)",
          boxShadow: "0 0 60px rgba(0, 255, 133, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Header with gradient accent */}
        <div className="relative">
          {/* Top gradient line */}
          <div 
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: "linear-gradient(90deg, #00ff85 0%, #06b6d4 50%, #8b5cf6 100%)",
            }}
          />
          
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(0, 255, 133, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)",
                  border: "1px solid rgba(0, 255, 133, 0.3)",
                }}
              >
                <Sparkles className="h-5 w-5 text-[#00ff85]" />
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: "conic-gradient(from 0deg, transparent, #00ff85, transparent)",
                  }}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  AI Copilot
                  <Zap className="h-3 w-3 text-[#00ff85]" />
                </h3>
                <p className="text-xs text-white/50">Powered by Llama 3.3</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-white/5 rounded-lg transition-all duration-200 group"
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4 text-white/50 group-hover:text-[#00ff85] transition-colors" />
                ) : (
                  <Minimize2 className="h-4 w-4 text-white/50 group-hover:text-[#00ff85] transition-colors" />
                )}
              </button>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-all duration-200 group"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-white/50 group-hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Content */}
        {!isMinimized && (
          <div className="flex-1 overflow-hidden">
            <CopilotChat compact />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
