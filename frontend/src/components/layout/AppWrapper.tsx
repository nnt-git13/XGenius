"use client"

import React, { useState, useEffect, useRef } from "react"
import { LoadInScreen } from "@/components/loading/LoadInScreen"
import { PageTransition } from "@/components/ui/PageTransition"

interface AppWrapperProps {
  children: React.ReactNode
}

/**
 * App wrapper that handles initial load-in screen
 * 
 * Only shows loading screen once per browser session (not on route changes)
 * 
 * Integration points for real loading signals:
 * - Route ready: Set isReady when Next.js route is loaded
 * - Auth ready: Set isReady when auth state is determined
 * - Data ready: Set isReady when initial data fetch completes
 */
export const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  // Use ref to track if loading has been shown (persists across re-renders)
  const hasShownLoadingRef = useRef(false)
  const [showLoading, setShowLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    // Only show loading on the very first mount
    if (hasShownLoadingRef.current) {
      // Already shown, skip loading
      setHasLoaded(true)
      return
    }

    // Check if user has seen loading in this session
    const hasSeenLoading = typeof window !== 'undefined' && sessionStorage.getItem("xgenius-initial-load")
    
    if (hasSeenLoading) {
      // Already shown in this session, skip
      hasShownLoadingRef.current = true
      setHasLoaded(true)
      return
    }

    // First time - show loading screen
    hasShownLoadingRef.current = true
    setShowLoading(true)
    
    // Mark as seen in session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem("xgenius-initial-load", "true")
    }

    // Simulate loading progression
    const hasSeenBefore = typeof window !== 'undefined' && localStorage.getItem("xgenius-has-loaded")
    const duration = hasSeenBefore ? 2000 : 3000

    const readyTimer = setTimeout(() => {
      setIsReady(true)
      if (typeof window !== 'undefined' && !hasSeenBefore) {
        localStorage.setItem("xgenius-has-loaded", "true")
      }
    }, duration)

    return () => {
      clearTimeout(readyTimer)
    }
  }, []) // Empty deps - only run once on mount

  const handleComplete = () => {
    setTimeout(() => {
      setHasLoaded(true)
      setShowLoading(false)
    }, 400)
  }

  // If we've already loaded, just show children (no transition wrapper needed for route changes)
  if (hasLoaded || !showLoading) {
    return <>{children}</>
  }

  // Show loading screen only on initial load
  return (
    <LoadInScreen
      key="load-in"
      isReady={isReady}
      minDurationMs={2500}
      onComplete={handleComplete}
      messages={[
        "Initializing...",
        "Syncing data...",
        "Optimizing charts...",
        "Preparing dashboard...",
        "Almost ready...",
      ]}
    />
  )
}

