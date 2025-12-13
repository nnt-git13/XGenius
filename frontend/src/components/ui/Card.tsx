"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glow" | "neon" | "glass"
  hover?: boolean
  children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = "default",
  hover = true,
  children,
  ...props
}) => {
    const variants = {
      default: "bg-fpl-gray border border-white/10",
      glow: "bg-fpl-gray border border-fpl-green/50 shadow-neon-green",
      neon: "bg-gradient-to-br from-fpl-purple/20 to-fpl-black border border-fpl-green/30 shadow-glow",
      glass: "bg-white/5 backdrop-blur-md border border-white/10",
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={hover ? { scale: 1.02, y: -2 } : {}}
      >
        <div
          className={cn(
            "rounded-xl p-6 transition-all duration-300",
            variants[variant],
            hover && "hover:border-fpl-green/50 hover:shadow-neon-green/50",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </motion.div>
    )
}

