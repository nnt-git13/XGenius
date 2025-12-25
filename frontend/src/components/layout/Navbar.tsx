"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  MessageSquare,
  Settings,
  Menu,
  X,
  BarChart3,
  Target,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/team", label: "My Team", icon: Users },
  { href: "/optimize", label: "Optimize", icon: Target },
  { href: "/transfers", label: "Transfers", icon: TrendingUp },
  { href: "/copilot", label: "AI Copilot", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
]

export const Navbar: React.FC = () => {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-ai-primary/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="text-2xl font-bold gradient-text"
            >
              XGenius
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 group",
                    isActive
                      ? "text-ai-primary font-semibold"
                      : "text-white/70 hover:text-white hover:bg-ai-light/50 hover:scale-105"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-ai-primary/20 rounded-lg border border-ai-primary/40 backdrop-blur-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className={cn(
                    "h-4 w-4 relative z-10 transition-transform",
                    isActive && "text-ai-primary",
                    "group-hover:scale-110"
                  )} />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white p-2 hover:bg-ai-light/50 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-ai-primary/20"
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "text-ai-primary bg-ai-primary/20 font-semibold"
                      : "text-white/70 hover:text-white hover:bg-ai-light/50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </motion.div>
        )}
      </div>
    </nav>
  )
}
