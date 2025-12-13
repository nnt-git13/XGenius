"use client"

import React from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ArrowLeft, TrendingUp, Target, Award, Calendar } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Loading } from "@/components/ui/Loading"
import { TeamRadarChart } from "@/components/charts/RadarChart"
import { PointsChart } from "@/components/charts/PointsChart"
import { StatCard } from "@/components/charts/StatCard"

export default function PlayerProfilePage() {
  const params = useParams()
  const playerId = params.id as string

  // Mock player data
  const playerData = {
    id: parseInt(playerId),
    name: "Erling Haaland",
    position: "FWD",
    team: "Manchester City",
    price: 140,
    total_points: 285,
    predicted_points: 8.5,
    form: 7.2,
    goals: 24,
    assists: 8,
    xG: 22.5,
    xA: 6.8,
  }

  const radarData = [
    { category: "Goals", value: 95 },
    { category: "Assists", value: 75 },
    { category: "Form", value: 85 },
    { category: "Fixture Difficulty", value: 70 },
    { category: "xG", value: 88 },
    { category: "xA", value: 72 },
  ]

  const pointsHistory = [
    { gameweek: 1, points: 8, expected: 7.5 },
    { gameweek: 2, points: 12, expected: 10 },
    { gameweek: 3, points: 6, expected: 8 },
    { gameweek: 4, points: 15, expected: 12 },
    { gameweek: 5, points: 9, expected: 9.5 },
    { gameweek: 6, points: 11, expected: 10.5 },
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-premier opacity-10" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Link href="/transfers">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transfers
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-fpl-green to-fpl-green-dark flex items-center justify-center text-4xl font-bold text-black">
              {playerData.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <h1 className="text-5xl font-bold gradient-text-premier mb-2">{playerData.name}</h1>
              <div className="flex items-center gap-4 text-white/70">
                <span>{playerData.position}</span>
                <span>•</span>
                <span>{playerData.team}</span>
                <span>•</span>
                <span className="text-fpl-green font-semibold">£{(playerData.price / 10).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Points"
            value={playerData.total_points}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Predicted Points"
            value={playerData.predicted_points.toFixed(1)}
            icon={Target}
          />
          <StatCard
            title="Goals"
            value={playerData.goals}
            icon={Award}
            variant="success"
          />
          <StatCard
            title="Assists"
            value={playerData.assists}
            icon={Award}
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card variant="glass">
            <h3 className="text-xl font-bold text-white mb-4">Points History</h3>
            <PointsChart data={pointsHistory} />
          </Card>
          <Card variant="glass">
            <h3 className="text-xl font-bold text-white mb-4">Player Attributes</h3>
            <TeamRadarChart data={radarData} />
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card variant="glass">
            <h3 className="text-xl font-bold text-white mb-4">Advanced Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Expected Goals (xG)</span>
                <span className="text-white font-semibold">{playerData.xG.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Expected Assists (xA)</span>
                <span className="text-white font-semibold">{playerData.xA.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Form</span>
                <span className="text-white font-semibold">{playerData.form}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Points per Game</span>
                <span className="text-white font-semibold">{(playerData.total_points / 6).toFixed(1)}</span>
              </div>
            </div>
          </Card>

          <Card variant="glass">
            <h3 className="text-xl font-bold text-white mb-4">Actions</h3>
            <div className="space-y-3">
              <Button variant="primary" className="w-full">
                Add to Watchlist
              </Button>
              <Button variant="outline" className="w-full">
                Compare with Other Players
              </Button>
              <Button variant="outline" className="w-full">
                View Fixture Difficulty
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

