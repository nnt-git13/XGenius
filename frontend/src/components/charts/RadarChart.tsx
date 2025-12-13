"use client"

import React from "react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Card } from "@/components/ui/Card"

interface RadarChartData {
  category: string
  value: number
  fullMark?: number
}

interface TeamRadarChartProps {
  data: RadarChartData[]
  title?: string
}

export const TeamRadarChart: React.FC<TeamRadarChartProps> = ({
  data,
  title = "Team Strength",
}) => {
  if (!data || data.length === 0) {
    return (
      <Card variant="glass">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-white/50">
          No data available
        </div>
      </Card>
    )
  }

  return (
    <Card variant="glass">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#ffffff20" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: "#ffffff70", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#ffffff50", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #00ff8533",
              borderRadius: "8px",
              color: "#fff",
            }}
          />
          <Radar
            name="Strength"
            dataKey="value"
            stroke="#00ff85"
            fill="#00ff85"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  )
}

