"use client"

import React from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  variant?: "default" | "success" | "warning" | "danger" | "info"
  trend?: {
    value: number
    direction: "up" | "down" | "neutral"
  }
  glow?: boolean
  delay?: number
  className?: string
}

const variantStyles = {
  default: {
    border: "border-ai-primary/20",
    glow: "shadow-glow",
    icon: "text-ai-primary",
  },
  success: {
    border: "border-green-500/30",
    glow: "shadow-[0_0_30px_rgba(34,197,94,0.4)]",
    icon: "text-green-400",
  },
  warning: {
    border: "border-yellow-500/30",
    glow: "shadow-[0_0_30px_rgba(234,179,8,0.4)]",
    icon: "text-yellow-400",
  },
  danger: {
    border: "border-red-500/30",
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.4)]",
    icon: "text-red-400",
  },
  info: {
    border: "border-ai-secondary/30",
    glow: "shadow-glow-cyan",
    icon: "text-ai-secondary",
  },
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  variant = "default",
  trend,
  glow = false,
  delay = 0,
  className,
}) => {
  const styles = variantStyles[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        "glass rounded-2xl p-6 border-2 relative overflow-hidden",
        styles.border,
        glow && styles.glow,
        className
      )}
    >
      {/* Animated background gradient */}
      <div
        className={cn(
          "absolute inset-0 opacity-10",
          variant === "default" && "bg-gradient-ai",
          variant === "success" && "bg-gradient-to-br from-green-500 to-emerald-500",
          variant === "warning" && "bg-gradient-to-br from-yellow-500 to-amber-500",
          variant === "danger" && "bg-gradient-to-br from-red-500 to-rose-500",
          variant === "info" && "bg-gradient-to-br from-ai-secondary to-ai-primary"
        )}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-white/60 uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Icon className={cn("h-5 w-5", styles.icon)} />
            </motion.div>
          )}
        </div>

        <div className="flex items-baseline gap-3">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2 }}
            className="text-3xl font-bold text-white"
          >
            {value}
          </motion.span>

          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.3 }}
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trend.direction === "up" && "text-green-400",
                trend.direction === "down" && "text-red-400",
                trend.direction === "neutral" && "text-gray-400"
              )}
            >
              <span>{trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
