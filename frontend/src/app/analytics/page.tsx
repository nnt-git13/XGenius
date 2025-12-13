"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { BarChart3, Download, FileDown, Image as ImageIcon, TrendingUp } from "lucide-react"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { PointsChart } from "@/components/charts/PointsChart"
import { TeamRadarChart } from "@/components/charts/RadarChart"
import { cn } from "@/lib/utils"

const pointsData = [
  { gameweek: 1, points: 65, expected: 68 },
  { gameweek: 2, points: 72, expected: 70 },
  { gameweek: 3, points: 58, expected: 65 },
  { gameweek: 4, points: 81, expected: 75 },
  { gameweek: 5, points: 69, expected: 72 },
  { gameweek: 6, points: 74, expected: 70 },
]

const radarData = [
  { category: "Attack", value: 75 },
  { category: "Defense", value: 68 },
  { category: "Midfield", value: 72 },
  { category: "GK", value: 80 },
  { category: "Depth", value: 65 },
  { category: "Form", value: 78 },
]

export default function AnalyticsPage() {
  const [comparisonMode, setComparisonMode] = useState<"current" | "previous">("current")

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log("Exporting to PDF...")
  }

  const handleExportPNG = () => {
    // TODO: Implement PNG export
    console.log("Exporting to PNG...")
  }

  return (
    <div className="min-h-screen bg-ai-darker relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center center' }}
        >
          <source src="/analytics.mp4" type="video/mp4" />
        </video>
        {/* Overlay for better content readability */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-premier opacity-20" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl z-10">
        {/* Header */}
        <SectionHeader
          title="Analytics"
          subtitle="Deep insights into your team's performance"
          action={
            <div className="flex gap-2">
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={handleExportPNG}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Export PNG
              </AnimatedButton>
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </AnimatedButton>
            </div>
          }
        />

        {/* Comparison Mode Toggle */}
        <GlassCard glow className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Season Comparison</h3>
              <p className="text-sm text-white/60">Compare current season with previous</p>
            </div>
            <div className="flex gap-2">
              <AnimatedButton
                variant={comparisonMode === "current" ? "primary" : "outline"}
                size="sm"
                onClick={() => setComparisonMode("current")}
              >
                Current
              </AnimatedButton>
              <AnimatedButton
                variant={comparisonMode === "previous" ? "primary" : "outline"}
                size="sm"
                onClick={() => setComparisonMode("previous")}
              >
                Previous
              </AnimatedButton>
            </div>
          </div>
        </GlassCard>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <GlassCard glow>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Points Trend</h3>
              <TrendingUp className="h-5 w-5 text-ai-primary" />
            </div>
            <PointsChart data={pointsData} />
          </GlassCard>

          <GlassCard glow>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Team Radar</h3>
              <BarChart3 className="h-5 w-5 text-ai-primary" />
            </div>
            <TeamRadarChart data={radarData} />
          </GlassCard>
        </div>

        {/* Additional Analytics */}
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard glow>
            <h4 className="text-lg font-bold text-white mb-3">Performance Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Average Points</span>
                <span className="text-white font-semibold">68.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Best Gameweek</span>
                <span className="text-white font-semibold">81</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Consistency</span>
                <span className="text-white font-semibold">85%</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard glow>
            <h4 className="text-lg font-bold text-white mb-3">Position Analysis</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Forwards</span>
                <span className="text-white font-semibold">75 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Midfielders</span>
                <span className="text-white font-semibold">72 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Defenders</span>
                <span className="text-white font-semibold">68 pts</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard glow>
            <h4 className="text-lg font-bold text-white mb-3">Chip Usage</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Free Hit</span>
                <span className="text-white font-semibold">Available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Wildcard</span>
                <span className="text-white font-semibold">Used</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Triple Captain</span>
                <span className="text-white font-semibold">Available</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
