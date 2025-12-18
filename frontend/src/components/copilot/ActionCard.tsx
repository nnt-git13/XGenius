"use client"

import React from "react"
import { motion } from "framer-motion"
import { CheckCircle, AlertTriangle, Loader2, Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionCardProps {
  action: {
    id: number
    tool_name: string
    status: string
    preview?: any
    requires_confirmation: boolean
  }
  onConfirm?: () => void
}

export const ActionCard: React.FC<ActionCardProps> = ({ action, onConfirm }) => {
  const getStatusIcon = () => {
    switch (action.status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case "failed":
        return <AlertTriangle className="h-5 w-5 text-red-400" />
      case "executing":
        return <Loader2 className="h-5 w-5 animate-spin text-ai-primary" />
      default:
        return <Play className="h-5 w-5 text-ai-primary" />
    }
  }

  const getStatusColor = () => {
    switch (action.status) {
      case "completed":
        return "border-green-500/30 bg-green-500/10"
      case "failed":
        return "border-red-500/30 bg-red-500/10"
      case "preview":
        return "border-ai-primary/30 bg-ai-primary/10"
      default:
        return "border-ai-primary/20 bg-ai-light/50"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border p-4",
        getStatusColor()
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-white capitalize">
              {action.tool_name.replace(/_/g, " ")}
            </h4>
            <span className="text-xs text-white/50 capitalize">
              {action.status}
            </span>
          </div>

          {action.preview && (
            <div className="mt-2 p-2 rounded bg-black/20 text-xs text-white/70 font-mono">
              <pre className="whitespace-pre-wrap">
                {typeof action.preview === "string"
                  ? action.preview
                  : JSON.stringify(action.preview, null, 2)}
              </pre>
            </div>
          )}

          {action.requires_confirmation && action.status === "preview" && (
            <button
              onClick={onConfirm}
              className="mt-3 px-3 py-1.5 text-xs font-semibold bg-ai-primary text-black rounded hover:bg-ai-primary/90 transition-colors"
            >
              Confirm & Execute
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

