"use client"

import React, { useState, useEffect, useMemo } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { usePerceivedProgress } from "./usePerceivedProgress";
import { ReducedMotionFallback } from "./ReducedMotionFallback";
import { easings, durations, transitions } from "./motionPresets";

interface LoadInScreenProps {
  isReady?: boolean;
  minDurationMs?: number;
  onComplete?: () => void;
  messages?: string[];
  theme?: "dark-glass" | "light-paper" | "midnight";
}

/**
 * Production-grade load-in screen with goal-themed animation
 * 
 * Animation stages:
 * - Stage A (0-20%): Logo fade + scale, background settle
 * - Stage B (20-80%): Ring progress with rotating highlight, inner dot with lag
 * - Stage C (80-100%): Slow approach, prepare transition
 * - Complete: Shared-element transition
 */
export const LoadInScreen: React.FC<LoadInScreenProps> = ({
  isReady = false,
  minDurationMs = 2500,
  onComplete,
  messages = [
    "Initializing...",
    "Syncing data...",
    "Optimizing charts...",
    "Preparing dashboard...",
    "Almost ready...",
  ],
  theme = "midnight",
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { progress, isComplete } = usePerceivedProgress({
    isReady,
    minDurationMs,
    onComplete,
  });

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Update message based on progress
  useEffect(() => {
    const messageIndex = Math.min(
      Math.floor(progress * messages.length),
      messages.length - 1
    );
    setCurrentMessageIndex(messageIndex);
  }, [progress, messages.length]);

  // Determine animation stage
  const stage = useMemo(() => {
    if (progress < 0.2) return "establish";
    if (progress < 0.8) return "progress";
    if (progress < 1) return "approach";
    return "complete";
  }, [progress]);

  // Ring progress calculation (0 to 360 degrees)
  const ringProgress = progress * 360;
  const ringOffset = 360 - ringProgress;

  // Reduced motion fallback
  if (prefersReducedMotion) {
    return (
      <ReducedMotionFallback
        progress={progress}
        messages={messages}
        currentMessageIndex={currentMessageIndex}
      />
    );
  }

  const themeClasses = {
    "dark-glass": "loading-theme-dark-glass",
    "light-paper": "loading-theme-light-paper",
    "midnight": "loading-theme-midnight",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: easings.easeInOut }}
      >
        {/* Main content container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-2xl px-6">
            {/* Stage A: Logo/Mark - Always show initially */}
            {(stage === "establish" || progress < 0.25 || progress === 0) && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{
                  duration: 0.4,
                  ease: easings.easeOut,
                }}
                className="text-center mb-16"
                style={{ opacity: 1 }} // Force visible
              >
              <motion.h1
                className="text-5xl md:text-6xl font-bold mb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.1,
                  duration: durations.slow,
                  ease: easings.easeOut,
                }}
              >
                <span className="gradient-text">XGenius</span>
              </motion.h1>
              <motion.p
                className="text-white/50 text-sm md:text-base"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: durations.normal }}
              >
                Fantasy Premier League Optimizer
              </motion.p>
            </motion.div>
          )}

          {/* Stage B & C: Goal Ring Progress */}
          {(stage === "progress" || stage === "approach" || progress >= 0.2) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={transitions.smooth}
              className="relative mx-auto w-64 h-64 md:w-80 md:h-80"
            >
              {/* Outer ring background */}
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 200 200"
              >
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="2"
                />

                {/* Progress arc */}
                <motion.circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 90 }}
                  animate={{
                    strokeDashoffset: ringOffset * (Math.PI / 180) * 90,
                  }}
                  transition={{
                    duration: 0.1,
                    ease: "linear",
                  }}
                />

                {/* Rotating highlight */}
                <motion.circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="url(#highlightGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="20 560"
                  strokeDashoffset="0"
                  animate={{
                    rotate: ringProgress,
                  }}
                  transition={{
                    duration: 0.1,
                    ease: "linear",
                  }}
                  style={{
                    transformOrigin: "100px 100px",
                    opacity: 0.6,
                  }}
                />

                {/* Gradients */}
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00ff85" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00ff85" stopOpacity="1" />
                    <stop offset="100%" stopColor="#00ff85" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inner dot (follows progress with lag) */}
              <motion.div
                className="absolute top-0 left-1/2 w-3 h-3 -translate-x-1/2"
                style={{
                  transformOrigin: "50% 128px", // Center of ring
                }}
                animate={{
                  rotate: ringProgress * 0.85, // Lag behind by 15%
                }}
                transition={{
                  duration: 0.15,
                  ease: easings.easeOut,
                }}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00ff85] to-[#06b6d4] shadow-lg shadow-[#00ff85]/50" />
              </motion.div>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  animate={{
                    scale: stage === "approach" ? 0.95 : 1,
                    opacity: stage === "approach" ? 0.8 : 1,
                  }}
                  transition={transitions.gentle}
                >
                  <motion.div
                    key={currentMessageIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                  >
                    <p className="text-white/70 text-sm md:text-base mb-2">
                      {messages[currentMessageIndex]}
                    </p>
                    <p className="text-white/40 text-xs">
                      {Math.round(progress * 100)}%
                    </p>
                  </motion.div>
                </motion.div>
              </div>

              {/* Micro-pulse at milestones */}
              <AnimatePresence>
                {[0.25, 0.5, 0.75].map((milestone) => {
                  const isAtMilestone =
                    progress >= milestone && progress < milestone + 0.02;
                  return isAtMilestone ? (
                    <motion.div
                      key={milestone}
                      className="absolute inset-0 rounded-full border-2 border-[#00ff85]/30"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.15, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: easings.easeOut }}
                    />
                  ) : null;
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Stage C: Transition preparation */}
          {stage === "approach" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center"
            >
              <motion.p
                className="text-white/50 text-sm"
                animate={{ opacity: [0.5, 0.7, 0.5] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Preparing your experience...
              </motion.p>
            </motion.div>
          )}
          </div>
        </div>

        {/* Soft glow effect that intensifies near completion */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(0, 255, 133, 0.03) 0%, transparent 70%)`,
          }}
          animate={{
            opacity: progress > 0.8 ? 0.1 : 0.03,
          }}
          transition={transitions.gentle}
        />
      </motion.div>
    </div>
  );
};

