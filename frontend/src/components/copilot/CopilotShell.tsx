"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Minimize2, Maximize2, Bot } from "lucide-react"
import { CopilotChat } from "./CopilotChat"
import { cn } from "@/lib/utils"

interface CopilotShellProps {
  defaultOpen?: boolean
  position?: "right" | "left" | "floating"
  onClose?: () => void
}

/**
 * Main copilot shell - can be docked or floating
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
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#00ff85] to-[#06b6d4] shadow-lg hover:shadow-[0_0_30px_rgba(0,255,133,0.5)] flex items-center justify-center transition-all"
        aria-label="Open Copilot"
      >
        <Bot className="h-6 w-6 text-black" />
      </motion.button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: position === "right" ? 400 : -400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: position === "right" ? 400 : -400 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "fixed z-50 bg-ai-darker border border-ai-primary/20 rounded-t-2xl shadow-2xl flex flex-col",
          position === "right" && "right-0 top-0 h-screen w-[420px] max-w-[90vw]",
          position === "left" && "left-0 top-0 h-screen w-[420px] max-w-[90vw]",
          position === "floating" && "bottom-6 right-6 w-[420px] h-[600px] max-w-[90vw] max-h-[90vh] rounded-2xl",
          isMinimized && "h-auto"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ai-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ff85] to-[#06b6d4] flex items-center justify-center">
              <Bot className="h-5 w-5 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI Copilot</h3>
              <p className="text-xs text-white/50">Your FPL assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-ai-light/50 rounded-lg transition-colors"
              aria-label={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4 text-white/70" />
              ) : (
                <Minimize2 className="h-4 w-4 text-white/70" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-ai-light/50 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-white/70" />
            </button>
          </div>
        </div>

        {/* Chat Content */}
        {!isMinimized && (
          <div className="flex-1 overflow-hidden">
            <CopilotChat />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

