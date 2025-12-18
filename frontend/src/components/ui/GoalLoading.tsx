"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface GoalLoadingProps {
  onComplete?: () => void
  duration?: number
  showLogin?: boolean
  onLogin?: () => void
}

export const GoalLoading: React.FC<GoalLoadingProps> = ({
  onComplete,
  duration = 5000,
  showLogin = false,
  onLogin,
}) => {
  const [phase, setPhase] = useState<"loading" | "scoring" | "complete">("loading")
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Start the animation sequence
    // Phase 1: Loading (60% of duration)
    const loadingPhase = duration * 0.6
    // Phase 2: Scoring animation (30% of duration)
    const scoringPhase = duration * 0.3
    // Phase 3: Complete (10% of duration)
    
    const timer1 = setTimeout(() => {
      setPhase("scoring")
    }, loadingPhase)

    const timer2 = setTimeout(() => {
      setPhase("complete")
      setShowContent(true)
    }, loadingPhase + scoringPhase)

    const timer3 = setTimeout(() => {
      onComplete?.()
    }, duration - 200) // Call onComplete slightly before end for smooth transition

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [duration, onComplete])

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 133, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 133, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Stadium atmosphere */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Goal Post */}
        <div className="relative w-[600px] h-[400px]">
          {/* Goal Net */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 600 400"
            preserveAspectRatio="none"
          >
            {/* Left Post */}
            <motion.line
              x1="50"
              y1="50"
              x2="50"
              y2="350"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
            {/* Right Post */}
            <motion.line
              x1="550"
              y1="50"
              x2="550"
              y2="350"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />
            {/* Crossbar */}
            <motion.line
              x1="50"
              y1="50"
              x2="550"
              y2="50"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            
            {/* Net lines */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.line
                key={`net-vert-${i}`}
                x1={50 + (i + 1) * 62.5}
                y1="50"
                x2={50 + (i + 1) * 62.5}
                y2="350"
                stroke="rgba(0, 255, 133, 0.3)"
                strokeWidth="1"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "scoring" ? 0.6 : 0.3 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.line
                key={`net-horiz-${i}`}
                x1="50"
                y1={50 + (i + 1) * 50}
                x2="550"
                y2={50 + (i + 1) * 50}
                stroke="rgba(0, 255, 133, 0.3)"
                strokeWidth="1"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "scoring" ? 0.6 : 0.3 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              />
            ))}
          </svg>

          {/* Football */}
          <motion.div
            className="absolute"
            initial={{ x: -100, y: 200 }}
            animate={
              phase === "scoring"
                ? {
                    x: [200, 250, 300],
                    y: [200, 150, 100],
                    scale: [1, 1.2, 1],
                    rotate: [0, 360, 720],
                  }
                : phase === "complete"
                ? { x: 300, y: 100, scale: 0 }
                : { x: -100, y: 200 }
            }
            transition={{
              duration: phase === "scoring" ? 1.2 : 0.3,
              ease: "easeOut",
            }}
          >
            <div className="w-16 h-16 relative">
              {/* Football pattern */}
              <div className="absolute inset-0 rounded-full bg-white shadow-lg">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <motion.path
                    d="M 50 20 L 30 50 L 50 80 L 70 50 Z"
                    fill="black"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.path
                    d="M 20 50 L 50 30 L 80 50 L 50 70 Z"
                    fill="black"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Goal celebration particles */}
          <AnimatePresence>
            {phase === "scoring" && (
              <>
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-[#00ff85] to-[#06b6d4]"
                    initial={{
                      x: 300,
                      y: 100,
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: 300 + (Math.random() - 0.5) * 400,
                      y: 100 + (Math.random() - 0.5) * 200,
                      scale: [0, 1, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.05,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Score Text */}
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: -50 }}
          animate={{
            opacity: phase === "scoring" || phase === "complete" ? 1 : 0,
            y: phase === "scoring" || phase === "complete" ? 0 : -50,
          }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <motion.h1
            className="text-8xl md:text-9xl font-black gradient-text"
            initial={{ scale: 0 }}
            animate={{ scale: phase === "scoring" ? [0, 1.2, 1] : 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            GOAL!
          </motion.h1>
          <motion.p
            className="text-2xl md:text-3xl text-white/70 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "scoring" || phase === "complete" ? 1 : 0 }}
            transition={{ delay: 1.5, duration: 0.6 }}
          >
            Welcome to XGenius
          </motion.p>
        </motion.div>

        {/* Loading progress bar */}
        {phase === "loading" && (
          <motion.div
            className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 max-w-[90vw]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#00ff85] via-[#06b6d4] to-[#8b5cf6]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: (duration * 0.6) / 1000, ease: "easeInOut" }}
              />
            </div>
            <motion.p
              className="text-center text-white/50 mt-4 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Loading your fantasy football experience...
            </motion.p>
          </motion.div>
        )}

        {/* Login/Enter Button */}
        <AnimatePresence>
          {showContent && showLogin && (
            <motion.div
              className="absolute bottom-1/4 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.button
                onClick={onLogin}
                className="px-8 py-4 bg-gradient-to-r from-[#00ff85] to-[#06b6d4] text-black font-bold text-lg rounded-lg shadow-lg hover:shadow-[0_0_30px_rgba(0,255,133,0.5)] transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Enter XGenius
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stadium crowd effect */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent opacity-30" />
    </div>
  )
}

