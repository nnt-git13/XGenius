"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  hover?: boolean
  onClick?: () => void
  delay?: number
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  glow = false,
  hover = true,
  onClick,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={hover ? { 
        y: -4, 
        scale: 1.02,
        transition: { duration: 0.3, ease: "easeOut" }
      } : {}}
      whileTap={hover ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={cn(
        "glass rounded-2xl p-6 transition-smooth relative overflow-hidden group",
        glow && "glass-glow",
        hover && "cursor-pointer",
        className
      )}
    >
      {/* Hover overlay gradient */}
      {hover && (
        <div className="absolute inset-0 bg-gradient-to-br from-ai-primary/0 via-ai-primary/0 to-ai-secondary/0 group-hover:from-ai-primary/10 group-hover:via-ai-primary/5 group-hover:to-ai-secondary/10 rounded-2xl transition-all duration-300 pointer-events-none z-0" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}

