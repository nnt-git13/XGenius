"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Settings as SettingsIcon, User, Bell, Shield, Palette, ToggleLeft, ToggleRight } from "lucide-react"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ParticleBackground } from "@/components/ui/ParticleBackground"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "@/components/ui/Toast"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { teamId, setTeamId } = useAppStore()
  const [inputTeamId, setInputTeamId] = useState<string>(teamId?.toString() || "")
  const [notifications, setNotifications] = useState({
    email: true,
    transfers: true,
    fixtures: false,
  })
  
  useEffect(() => {
    setInputTeamId(teamId?.toString() || "")
  }, [teamId])

  const handleSave = () => {
    const parsedId = inputTeamId ? parseInt(inputTeamId, 10) : null
    if (parsedId && parsedId > 0) {
      setTeamId(parsedId)
      toast.success("Team ID saved successfully!")
    } else if (inputTeamId === "") {
      setTeamId(null)
      toast.success("Team ID cleared")
    } else {
      toast.error("Please enter a valid team ID")
    }
  }

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="min-h-screen bg-ai-darker relative overflow-hidden">
      {/* Background */}
      <ParticleBackground particleCount={30} color="rgba(139, 92, 246, 0.1)" />
      <div className="absolute inset-0 bg-gradient-ai-dark opacity-40" />

      <div className="relative container mx-auto px-4 py-8 max-w-4xl z-10">
        {/* Header */}
        <SectionHeader
          title="Settings"
          subtitle="Manage your preferences and account"
        />

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Profile */}
          <GlassCard glow>
            <div className="flex items-center gap-3 mb-6">
              <User className="h-5 w-5 text-ai-primary" />
              <h3 className="text-xl font-bold text-white">Profile</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">FPL Team ID</label>
                <input
                  type="number"
                  value={inputTeamId}
                  onChange={(e) => setInputTeamId(e.target.value)}
                  placeholder="Enter your FPL Team ID"
                  className="w-full px-4 py-3 glass rounded-lg text-white placeholder-white/50 border border-ai-primary/20 focus:outline-none focus:ring-2 focus:ring-ai-primary"
                />
                <p className="text-white/50 text-xs mt-2">
                  Find your Team ID in the URL of your FPL team page: fantasy.premierleague.com/entry/{"{TEAM_ID}"}/event/...
                </p>
              </div>
              <AnimatedButton variant="primary" onClick={handleSave}>
                Save Changes
              </AnimatedButton>
            </div>
          </GlassCard>

          {/* Notifications */}
          <GlassCard glow>
            <div className="flex items-center gap-3 mb-6">
              <Bell className="h-5 w-5 text-ai-primary" />
              <h3 className="text-xl font-bold text-white">Notifications</h3>
            </div>
            <div className="space-y-4">
              {[
                { key: "email" as const, label: "Email notifications" },
                { key: "transfers" as const, label: "Transfer recommendations" },
                { key: "fixtures" as const, label: "Fixture reminders" },
              ].map((setting) => (
                <motion.div
                  key={setting.key}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-3 rounded-lg glass border border-ai-primary/10 hover:border-ai-primary/30 transition-colors"
                >
                  <span className="text-white/80">{setting.label}</span>
                  <button
                    onClick={() => toggleNotification(setting.key)}
                    className="relative"
                  >
                    {notifications[setting.key] ? (
                      <ToggleRight className="h-6 w-6 text-ai-primary" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-white/30" />
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Privacy */}
          <GlassCard glow>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5 text-ai-primary" />
              <h3 className="text-xl font-bold text-white">Privacy</h3>
            </div>
            <p className="text-white/70 text-sm mb-4">
              Your data is encrypted and stored securely. We never share your FPL team information.
            </p>
            <AnimatedButton variant="outline">
              View Privacy Policy
            </AnimatedButton>
          </GlassCard>

          {/* Appearance */}
          <GlassCard glow>
            <div className="flex items-center gap-3 mb-6">
              <Palette className="h-5 w-5 text-ai-primary" />
              <h3 className="text-xl font-bold text-white">Appearance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg glass border border-ai-primary/10">
                <span className="text-white/80">Theme</span>
                <span className="text-ai-primary font-semibold">Dark (Default)</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
