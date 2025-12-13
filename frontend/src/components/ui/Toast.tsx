"use client"

import { toast as hotToast } from "react-hot-toast"
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export const toast = {
  success: (message: string) => {
    hotToast.custom((t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="flex items-center gap-3 bg-fpl-gray border border-fpl-green/50 rounded-lg px-4 py-3 shadow-neon-green max-w-md"
          >
            <CheckCircle2 className="h-5 w-5 text-fpl-green" />
            <span className="text-white flex-1">{message}</span>
            <button onClick={() => hotToast.dismiss(t.id)} className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    ))
  },
  error: (message: string) => {
    hotToast.custom((t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="flex items-center gap-3 bg-fpl-gray border border-red-500/50 rounded-lg px-4 py-3 shadow-lg max-w-md"
          >
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-white flex-1">{message}</span>
            <button onClick={() => hotToast.dismiss(t.id)} className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    ))
  },
  info: (message: string) => {
    hotToast.custom((t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="flex items-center gap-3 bg-fpl-gray border border-blue-500/50 rounded-lg px-4 py-3 shadow-lg max-w-md"
          >
            <Info className="h-5 w-5 text-blue-500" />
            <span className="text-white flex-1">{message}</span>
            <button onClick={() => hotToast.dismiss(t.id)} className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    ))
  },
  warning: (message: string) => {
    hotToast.custom((t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="flex items-center gap-3 bg-fpl-gray border border-yellow-500/50 rounded-lg px-4 py-3 shadow-lg max-w-md"
          >
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="text-white flex-1">{message}</span>
            <button onClick={() => hotToast.dismiss(t.id)} className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    ))
  },
}

