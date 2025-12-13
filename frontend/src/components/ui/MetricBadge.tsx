"use client"

import React from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricBadgeProps {
  value: number | string
  label: string
  trend?: "up" | "down" | "neutral"
  trendValue?: number
  variant?: "default" | "success" | "warning" | "danger"
  icon?: React.ReactNode
  className?: string
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  value,
  label,
  trend,
  trendValue,
  variant = "default",
  icon,
  className,
}) => {
  const variantStyles = {
    default: "bg-ai-light/50 border-ai-primary/20",
    success: "bg-green-500/10 border-green-500/30",
    warning: "bg-yellow-500/10 border-yellow-500/30",
    danger: "bg-red-500/10 border-red-500/30",
  }

  const trendIcon = {
    up: <TrendingUp className="h-3 w-3 text-green-400" />,
    down: <TrendingDown className="h-3 w-3 text-red-400" />,
    neutral: <Minus className="h-3 w-3 text-gray-400" />,
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "glass rounded-xl p-4 border",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/60 uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className="text-ai-primary">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && trendValue !== undefined && (
          <div className="flex items-center gap-1 text-xs">
            {trendIcon[trend]}
            <span
              className={cn(
                trend === "up" && "text-green-400",
                trend === "down" && "text-red-400",
                trend === "neutral" && "text-gray-400"
              )}
            >
              {Math.abs(trendValue)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

