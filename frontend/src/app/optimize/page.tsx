"use client"

import React, { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Target, TrendingUp, Clock, Settings, CheckCircle2, ArrowRight, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { Loading } from "@/components/ui/Loading"
import { cn } from "@/lib/utils"

export default function OptimizePage() {
  const [optimizationType, setOptimizationType] = useState<"1gw" | "3gw" | "longterm">("1gw")
  const [showResults, setShowResults] = useState(false)
  const [budget, setBudget] = useState(1000)

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const budgetInMillions = budget / 10
      return await api.optimizeSquad({
        season: "2024-25",
        budget: budgetInMillions,
        horizon_gw: optimizationType === "1gw" ? 1 : optimizationType === "3gw" ? 3 : 5,
      })
    },
    onSuccess: (data) => {
      setShowResults(true)
    },
    onError: (error: any) => {
      console.error("Optimization error:", error)
    },
  })

  const handleOptimize = () => {
    optimizeMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-ai-darker relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/optimize.mp4" type="video/mp4" />
        </video>
        {/* Overlay for better content readability */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-premier opacity-20" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl z-10">
        {/* Header */}
        <SectionHeader
          title="Squad Optimizer"
          subtitle="AI-powered squad optimization with ML predictions"
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard glow>
              <div className="flex items-center gap-2 mb-6">
                <Settings className="h-5 w-5 text-ai-primary" />
                <h3 className="text-xl font-bold text-white">Settings</h3>
              </div>

              {/* Optimization Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Optimization Horizon
                </label>
                <div className="space-y-2">
                  {[
                    { value: "1gw", label: "Next Gameweek", icon: Clock },
                    { value: "3gw", label: "3 Gameweeks", icon: TrendingUp },
                    { value: "longterm", label: "Long Term", icon: Target },
                  ].map((option) => {
                    const Icon = option.icon
                    return (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setOptimizationType(option.value as any)}
                        className={cn(
                          "w-full p-4 rounded-lg border-2 transition-all text-left",
                          optimizationType === option.value
                            ? "border-ai-primary bg-ai-primary/10"
                            : "border-ai-primary/20 glass hover:border-ai-primary/40"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn(
                            "h-5 w-5",
                            optimizationType === option.value ? "text-ai-primary" : "text-white/60"
                          )} />
                          <span className={cn(
                            "font-medium",
                            optimizationType === option.value ? "text-white" : "text-white/70"
                          )}>
                            {option.label}
                          </span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Budget */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Budget (£M)
                </label>
                <input
                  type="number"
                  value={budget / 10}
                  onChange={(e) => setBudget(parseFloat(e.target.value) * 10 || 0)}
                  className="w-full glass rounded-lg px-4 py-3 text-white border border-ai-primary/20 focus:outline-none focus:ring-2 focus:ring-ai-primary"
                  min={0}
                  step={0.1}
                />
              </div>

              {/* Optimize Button */}
              <AnimatedButton
                variant="primary"
                size="lg"
                glow
                onClick={handleOptimize}
                disabled={optimizeMutation.isPending}
                className="w-full flex items-center justify-center gap-2"
              >
                {optimizeMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 flex-shrink-0" />
                    <span>Optimize Squad</span>
                  </>
                )}
              </AnimatedButton>
            </GlassCard>

            {/* Explanation Sidebar */}
            <GlassCard>
              <h4 className="text-lg font-bold text-white mb-3">How It Works</h4>
              <div className="space-y-3 text-sm text-white/70">
                <p>
                  Our AI optimizer uses machine learning models to predict player performance
                  and finds the optimal squad configuration.
                </p>
                <p>
                  Select your optimization horizon to balance short-term gains vs long-term strategy.
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {optimizeMutation.isPending ? (
              <GlassCard glow className="min-h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="inline-block mb-4"
                  >
                    <Zap className="h-16 w-16 text-ai-primary" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2">Optimizing Your Squad</h3>
                  <p className="text-white/70">
                    Analyzing thousands of combinations to find the perfect team...
                  </p>
                </div>
              </GlassCard>
            ) : optimizeMutation.isSuccess && showResults ? (
              <GlassCard glow>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Optimization Results</h3>
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                {/* Results content would go here */}
                <div className="text-white/70">
                  Optimization complete! Results will be displayed here.
                </div>
              </GlassCard>
            ) : (
              <GlassCard glow className="min-h-[600px] flex items-center justify-center">
                <div className="text-center max-w-md">
                  <Target className="h-16 w-16 text-ai-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Ready to Optimize</h3>
                  <p className="text-white/70 mb-6">
                    Configure your settings and click "Optimize Squad" to get AI-powered recommendations.
                  </p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
