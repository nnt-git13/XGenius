"use client"

import React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import { Card } from "@/components/ui/Card"

interface PointsChartProps {
  data: Array<{ gameweek: number; points: number; expected?: number }>
  title?: string
  /** When true, renders only the chart (no Card wrapper / title). */
  embedded?: boolean
}

export const PointsChart: React.FC<PointsChartProps> = ({ data, title = "Points Trend", embedded = false }) => {
  if (!data || data.length === 0) {
    if (embedded) {
      return <div className="h-[240px] flex items-center justify-center text-white/50">No data available</div>
    }
    return (
      <Card variant="glass">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-white/50">No data available</div>
      </Card>
    )
  }

  const Chart = (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00ff85" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#00ff85" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis
          dataKey="gameweek"
          stroke="#ffffff50"
          tick={{ fill: "#ffffff70" }}
          label={{ value: "GW", position: "insideBottom", offset: -5, fill: "#ffffff70" }}
        />
        <YAxis stroke="#ffffff50" tick={{ fill: "#ffffff70" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #00ff8533",
            borderRadius: "8px",
            color: "#fff",
          }}
        />
        <Area type="monotone" dataKey="points" stroke="#00ff85" fillOpacity={1} fill="url(#colorPoints)" />
        {data && data.length > 0 && data[0]?.expected !== undefined && (
          <Line type="monotone" dataKey="expected" stroke="#8b5cf6" strokeDasharray="5 5" strokeWidth={2} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )

  if (embedded) return Chart

  return (
    <Card variant="glass">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="h-[300px]">{Chart}</div>
    </Card>
  )
}

