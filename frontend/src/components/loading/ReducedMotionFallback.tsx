"use client"

import React from "react";
import { motion } from "framer-motion";

interface ReducedMotionFallbackProps {
  progress: number;
  messages: string[];
  currentMessageIndex: number;
  children?: React.ReactNode;
}

/**
 * Fallback UI for users who prefer reduced motion
 * Shows static layout with minimal opacity transitions
 */
export const ReducedMotionFallback: React.FC<ReducedMotionFallbackProps> = ({
  progress,
  messages,
  currentMessageIndex,
  children,
}) => {
  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md px-6">
        {/* Logo/Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-4xl font-bold gradient-text mb-2">XGenius</h1>
          <p className="text-white/60 text-sm">Fantasy Premier League Optimizer</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#00ff85] via-[#06b6d4] to-[#8b5cf6]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>

        {/* Status Message */}
        <motion.div
          key={currentMessageIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-[1.5rem]"
        >
          <p className="text-white/70 text-sm">
            {messages[currentMessageIndex] || "Loading..."}
          </p>
        </motion.div>

        {children}
      </div>
    </div>
  );
};

