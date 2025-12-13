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
      whileHover={hover ? { y: -4, scale: 1.02 } : undefined}
      onClick={onClick}
      className={cn(
        "glass rounded-2xl p-6",
        glow && "glass-glow",
        hover && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  )
}

