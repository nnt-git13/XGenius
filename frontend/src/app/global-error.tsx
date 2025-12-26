"use client"

import React from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-premier opacity-20" />
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 20}s`,
                animationDuration: `${15 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex p-4 rounded-full bg-red-500/20 mb-6"
            >
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-white mb-4"
            >
              Application Error
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/70 text-lg mb-6"
            >
              {error.message || "An unexpected error occurred"}
            </motion.p>

            {error.digest && (
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/50 text-sm mb-8 font-mono"
              >
                Error ID: {error.digest}
              </motion.p>
            )}

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={reset}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white hover:shadow-neon-blue transition-all"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Try Again
              </motion.button>
              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium border-2 border-fpl-green text-fpl-green hover:bg-fpl-green/10 transition-all"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Go Home
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </body>
    </html>
  )
}








