"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { CopilotShell } from "./CopilotShell"
import { CopilotCommandBar } from "./CopilotCommandBar"

/**
 * Floating copilot assistant - appears on all pages except /copilot
 */
export const CopilotFloating: React.FC = () => {
  const pathname = usePathname()
  
  // Don't show floating assistant on the copilot page itself
  if (pathname === "/copilot") {
    return null
  }

  return (
    <>
      <CopilotShell position="floating" defaultOpen={false} />
      <CopilotCommandBar />
    </>
  )
}

