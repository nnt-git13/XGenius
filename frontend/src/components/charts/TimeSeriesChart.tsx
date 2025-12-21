"use client"

import React from "react"
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts"

type Datum = Record<string, any>

export function TimeSeriesChart({
  data,
  xKey = "gameweek",
  yKey,
  kind = "area",
  color = "#00ff85",
}: {
  data: Datum[]
  xKey?: string
  yKey: string
  kind?: "area" | "bar"
  color?: string
}) {
  if (!data?.length) {
    return <div className="h-[240px] flex items-center justify-center text-white/50">No data available</div>
  }

  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
      <XAxis
        dataKey={xKey}
        stroke="#ffffff50"
        tick={{ fill: "#ffffff70" }}
        label={{ value: "GW", position: "insideBottom", offset: -5, fill: "#ffffff70" }}
      />
      <YAxis stroke="#ffffff50" tick={{ fill: "#ffffff70" }} />
      <Tooltip
        contentStyle={{
          backgroundColor: "#1a1a1a",
          border: `1px solid ${color}33`,
          borderRadius: "8px",
          color: "#fff",
        }}
      />
    </>
  )

  return (
    <ResponsiveContainer width="100%" height={240}>
      {kind === "bar" ? (
        <BarChart data={data}>
          {common}
          <Bar dataKey={yKey} fill={color} fillOpacity={0.65} />
        </BarChart>
      ) : (
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`ts-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {common}
          <Area type="monotone" dataKey={yKey} stroke={color} fillOpacity={1} fill={`url(#ts-${yKey})`} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  )
}


