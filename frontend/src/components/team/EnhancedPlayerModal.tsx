"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Crown, X, TrendingUp, Target, AlertCircle, Activity } from "lucide-react"
import { PlayerDetail } from "@/types/team"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface EnhancedPlayerModalProps {
  player: PlayerDetail | null
  isCaptain?: boolean
  isViceCaptain?: boolean
  onClose?: () => void
  onSetCaptain?: () => void
  onTransfer?: () => void
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  a: { label: "Available", color: "text-green-400", bg: "bg-green-500/20" },
  i: { label: "Injured", color: "text-red-400", bg: "bg-red-500/20" },
  s: { label: "Suspended", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  u: { label: "Unavailable", color: "text-gray-400", bg: "bg-gray-500/20" },
  d: { label: "Doubtful", color: "text-orange-400", bg: "bg-orange-500/20" },
}

export const EnhancedPlayerModal: React.FC<EnhancedPlayerModalProps> = ({
  player,
  isCaptain,
  isViceCaptain,
  onClose,
  onSetCaptain,
  onTransfer,
}) => {
  if (!player) {
    return (
      <Card variant="glass" className="h-full">
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <Target className="h-12 w-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/70">Select a player to view details</p>
          </div>
        </div>
      </Card>
    )
  }

  const status = STATUS_LABELS[player.status] || STATUS_LABELS.a

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <Card variant="glow" className="h-full relative overflow-hidden">
          {/* Animated background gradient */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.5) 0%, transparent 50%)",
                "radial-gradient(circle at 100% 100%, rgba(147,51,234,0.5) 0%, transparent 50%)",
                "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.5) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-white">{player.name}</h3>
                  {isCaptain && (
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Crown className="h-5 w-5 text-yellow-400" />
                    </motion.div>
                  )}
                  {isViceCaptain && <Crown className="h-5 w-5 text-blue-400" />}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="px-2 py-1 rounded bg-fpl-green/20 text-fpl-green font-semibold">
                    {player.position}
                  </span>
                  <span className="text-white/70">{player.team}</span>
                  <span className={cn("px-2 py-1 rounded text-xs font-medium", status.bg, status.color)}>
                    {status.label}
                  </span>
                </div>
              </div>
              {onClose && (
                <motion.button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5 text-white/70" />
                </motion.button>
              )}
            </div>

            {/* Stats Grid with animations */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: "Price", value: `£${player.price.toFixed(1)}M`, icon: Target },
                { label: "Total Points", value: player.total_points.toFixed(0), icon: TrendingUp },
                { label: "Goals", value: player.goals_scored, icon: Activity },
                { label: "Assists", value: player.assists, icon: Activity },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 rounded-lg p-4 backdrop-blur-sm border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className="h-4 w-4 text-white/60" />
                    <p className="text-white/60 text-sm">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Additional Stats */}
            <div className="space-y-3 mb-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-between py-2 border-b border-white/10"
              >
                <span className="text-white/70 text-sm">Clean Sheets</span>
                <span className="text-white font-semibold">{player.clean_sheets}</span>
              </motion.div>
              {player.fpl_code && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-between py-2 border-b border-white/10"
                >
                  <span className="text-white/70 text-sm">FPL Code</span>
                  <span className="text-white font-semibold">{player.fpl_code}</span>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2 pt-4 border-t border-white/10"
            >
              {!isCaptain && onSetCaptain && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={onSetCaptain}
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Set as Captain
                </Button>
              )}
              {onTransfer && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onTransfer}
                >
                  Transfer Out
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = `/player/${player.id}`}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                View Full Stats
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

