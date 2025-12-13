"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("flex items-center justify-between mb-8", className)}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-2 break-words">{title}</h2>
        {subtitle && (
          <p className="text-white/60 text-sm break-words">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  )
}

