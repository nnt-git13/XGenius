"use client"

import React from "react"
import { motion } from "framer-motion"
import { AnimatedButton } from "./AnimatedButton"
import { cn } from "@/lib/utils"

interface HeroSectionProps {
  title: string | React.ReactNode
  subtitle?: string
  description?: string
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  background?: "particles" | "gradient" | "none"
  className?: string
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryAction,
  background = "gradient",
  className,
}) => {
  return (
    <section className={cn("relative min-h-[80vh] flex items-center justify-center overflow-hidden", className)}>
      {/* Background */}
      {background === "gradient" && (
        <div className="absolute inset-0 bg-gradient-ai-dark opacity-50" />
      )}
      {background === "particles" && (
        <div className="absolute inset-0">
          {/* Particle animation will be added */}
          <div className="absolute inset-0 bg-gradient-ai-dark opacity-30" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-ai-primary text-sm uppercase tracking-wider mb-4"
            >
              {subtitle}
            </motion.p>
          )}
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 px-4 break-words"
          >
            {typeof title === "string" ? (
              <span className="gradient-text break-words">{title}</span>
            ) : (
              title
            )}
          </motion.h1>

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-base sm:text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-8 px-4 break-words"
            >
              {description}
            </motion.p>
          )}

          {(primaryAction || secondaryAction) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-4 relative z-20"
            >
              {primaryAction && (
                <AnimatedButton
                  variant="primary"
                  size="lg"
                  glow
                  onClick={primaryAction.onClick}
                  className="relative z-20"
                >
                  {primaryAction.label}
                </AnimatedButton>
              )}
              {secondaryAction && (
                <AnimatedButton
                  variant="outline"
                  size="lg"
                  onClick={secondaryAction.onClick}
                  className="relative z-20"
                >
                  {secondaryAction.label}
                </AnimatedButton>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

