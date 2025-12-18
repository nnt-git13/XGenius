"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { CopilotShell } from "./CopilotShell"
import { CopilotCommandBar } from "./CopilotCommandBar"

/**
 * Floating copilot assistant - appears on all pages except /copilot
 * This is a client component wrapper to use usePathname
 */
export const CopilotFloatingWrapper: React.FC = () => {
  const pathname = usePathname()
  
  // Don't show floating assistant on the copilot page or homepage
  if (pathname === "/copilot" || pathname === "/") {
    return null
  }

  return (
    <>
      <CopilotShell position="floating" defaultOpen={false} />
      <CopilotCommandBar />
    </>
  )
}

