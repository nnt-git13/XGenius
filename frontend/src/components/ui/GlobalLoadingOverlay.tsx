"use client"

import React, { useState, useEffect, useRef } from "react"
import { useLoadingStore } from "@/store/useLoadingStore"
import { useIsFetching, useIsMutating } from "@tanstack/react-query"
import { LoadInScreen } from "@/components/loading/LoadInScreen"
import { AnimatePresence } from "framer-motion"

export function GlobalLoadingOverlay() {
  const isLoading = useLoadingStore((state) => state.isLoading())
  const isFetching = useIsFetching() > 0
  const isMutating = useIsMutating() > 0
  
  // Show loading if any API call is in progress (axios or react-query)
  const showLoading = isLoading || isFetching || isMutating
  
  // Track loading state to control animation
  const [isReady, setIsReady] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const loadingStartTimeRef = useRef<number | null>(null)
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (showLoading) {
      // Started loading - show overlay and reset ready state
      if (!loadingStartTimeRef.current) {
        loadingStartTimeRef.current = Date.now()
        setShowOverlay(true)
        setIsReady(false)
      }
      // Clear any pending completion timer
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current)
        completionTimerRef.current = null
      }
    } else {
      // Finished loading - mark as ready and let animation complete
      if (loadingStartTimeRef.current) {
        setIsReady(true)
        loadingStartTimeRef.current = null
        
        // Hide overlay after animation completes (LoadInScreen handles the exit)
        completionTimerRef.current = setTimeout(() => {
          setShowOverlay(false)
          setIsReady(false)
        }, 600) // Slightly longer than animation duration
      }
    }
    
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current)
      }
    }
  }, [showLoading])

  return (
    <AnimatePresence>
      {showOverlay && (
        <LoadInScreen
          isReady={isReady}
          minDurationMs={200}
          messages={[
            "Fetching data...",
            "Processing request...",
            "Almost there...",
          ]}
          theme="midnight"
        />
      )}
    </AnimatePresence>
  )
}

