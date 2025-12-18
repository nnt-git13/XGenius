"use client"

import React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedButtonProps extends Omit<HTMLMotionProps<"button">, "onDrag" | "onDragStart" | "onDragEnd"> {
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  glow?: boolean
  magnetic?: boolean
  children: React.ReactNode
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = "primary",
  size = "md",
  glow = false,
  magnetic = true,
  children,
  className,
  ...props
}) => {
  const variants = {
    primary: "text-black font-semibold hover:shadow-neon-green opacity-100",
    secondary: "bg-ai-light text-white border border-ai-primary/30 hover:border-ai-primary opacity-100",
    outline: "border-2 border-ai-primary text-ai-primary bg-transparent hover:bg-ai-primary/10 opacity-100",
    ghost: "text-white hover:bg-ai-light/50 opacity-100",
  }

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  }

  return (
    <motion.button
      whileHover={magnetic ? { 
        scale: 1.05, 
        y: -2,
        transition: { duration: 0.2, ease: "easeOut" }
      } : { 
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      className={cn(
        "rounded-lg font-medium transition-all duration-300 relative break-words overflow-wrap-anywhere whitespace-normal",
        variants[variant],
        sizes[size],
        glow && "shadow-glow hover:shadow-[0_0_30px_rgba(0,255,133,0.5)]",
        className
      )}
      style={
        variant === "primary"
          ? {
              background: "linear-gradient(135deg, #00ff85 0%, #06b6d4 50%, #8b5cf6 100%)",
            }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.button>
  )
}
