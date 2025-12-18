"use client"

import React from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Clock, AlertCircle, Loader2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToolStatusIndicatorProps {
  toolName: string
  status: "pending" | "preview" | "executing" | "completed" | "failed" | "cancelled"
  className?: string
}

const statusConfig = {
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Pending" },
  preview: { icon: Clock, color: "text-blue-400", bg: "bg-blue-400/10", label: "Preview" },
  executing: { icon: Loader2, color: "text-ai-primary", bg: "bg-ai-primary/10", label: "Running", animate: true },
  completed: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Failed" },
  cancelled: { icon: XCircle, color: "text-gray-400", bg: "bg-gray-400/10", label: "Cancelled" },
}

export const ToolStatusIndicator: React.FC<ToolStatusIndicatorProps> = ({
  toolName,
  status,
  className,
}) => {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
        config.bg,
        className
      )}
    >
      {config.animate ? (
        <Icon className={cn("h-3.5 w-3.5", config.color)} style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <Icon className={cn("h-3.5 w-3.5", config.color)} />
      )}
      <span className={cn("font-medium", config.color)}>{config.label}</span>
      <span className="text-white/60">•</span>
      <span className="text-white/80">{toolName}</span>
    </motion.div>
  )
}

