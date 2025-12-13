"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "neon"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  children,
  disabled,
  onDrag,
  onDragEnd,
  onDragStart,
  ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
    
    const variants = {
      primary: "bg-gradient-to-r from-fpl-green to-fpl-green-dark text-fpl-black hover:shadow-neon-green focus:ring-fpl-green",
      secondary: "bg-gradient-to-r from-fpl-purple to-fpl-purple-dark text-white hover:shadow-neon-purple focus:ring-fpl-purple",
      outline: "border-2 border-fpl-green text-fpl-green hover:bg-fpl-green/10 focus:ring-fpl-green",
      ghost: "text-white hover:bg-white/10 focus:ring-fpl-green",
      neon: "bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white hover:shadow-neon-blue focus:ring-neon-blue animate-shimmer bg-[length:200%_100%]",
    }
    
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    }

    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <button
          className={cn(baseStyles, variants[variant], sizes[size], className)}
          disabled={disabled || isLoading}
          {...props}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            children
          )}
        </button>
      </motion.div>
    )
}

