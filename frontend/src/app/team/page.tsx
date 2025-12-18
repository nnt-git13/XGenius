"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Users, Crown, AlertCircle, Target, TrendingUp, Settings } from "lucide-react"
import { api } from "@/lib/api"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { Loading } from "@/components/ui/Loading"
import { StatCard } from "@/components/charts/StatCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { useAppStore } from "@/store/useAppStore"
import { TeamEvaluationResponse, PlayerDetail, FORMATIONS, Formation } from "@/types/team"
import { EnhancedPitch } from "@/components/team/EnhancedPitch"
import { EnhancedBenchView } from "@/components/team/EnhancedBenchView"
import { EnhancedPlayerModal } from "@/components/team/EnhancedPlayerModal"
import { AICopilotPanel } from "@/components/team/AICopilotPanel"
import { ParticleBackground } from "@/components/ui/ParticleBackground"

// Detect formation from player positions
const detectFormation = (players: PlayerDetail[]): Formation => {
  const def = players.filter(p => p.position === "DEF").length
  const mid = players.filter(p => p.position === "MID").length
  const fwd = players.filter(p => p.position === "FWD").length
  
  const formation = FORMATIONS.find(f => f.def === def && f.mid === mid && f.fwd === fwd)
  return formation || FORMATIONS[0]
}

export default function MyTeamPage() {
  const { teamId } = useAppStore()
  const queryClient = useQueryClient()
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null)
  const [hoveredPlayer, setHoveredPlayer] = useState<PlayerDetail | null>(null)
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null)
  
  const { data: teamData, isLoading, error } = useQuery<TeamEvaluationResponse>({
    queryKey: ["my-team", teamId],
    queryFn: async () => {
      return await api.evaluateTeam({ 
        season: "2024-25",
        team_id: teamId || undefined,
      }) as TeamEvaluationResponse
    },
    enabled: !!teamId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 0,
    placeholderData: {
      total_points: 0,
      expected_points: 0,
      squad_value: 0,
      bank: 100,
      players: [],
      captain_id: null,
      vice_captain_id: null,
      xg_score: 0,
      risk_score: 0.5,
      fixture_difficulty: 3.0,
    },
    // Don't treat network errors as errors if we have placeholder data
    throwOnError: false,
  })

  const { startingXI, bench } = useMemo(() => {
    if (!teamData?.players || teamData.players.length === 0) {
      return { startingXI: [], bench: [] }
    }
    
    const allPlayers = teamData.players
    const startingXI = allPlayers.slice(0, 11)
    const bench = allPlayers.slice(11, 15)
    
    return { startingXI, bench }
  }, [teamData])

  const formation = useMemo(() => {
    if (selectedFormation) return selectedFormation
    if (startingXI.length > 0) return detectFormation(startingXI)
    return FORMATIONS[0]
  }, [startingXI, selectedFormation])

  // Show message if no team ID is configured
  if (!teamId) {
    return (
      <div className="min-h-screen bg-ai-darker relative">
        <ParticleBackground particleCount={30} />
        <div className="relative container mx-auto px-4 py-8 max-w-7xl z-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <GlassCard className="max-w-md text-center">
              <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Team Configured</h2>
              <p className="text-white/70 mb-4">
                Please configure your team ID in settings to view your team.
              </p>
              <AnimatedButton onClick={() => window.location.href = "/settings"}>
                Go to Settings
              </AnimatedButton>
            </GlassCard>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading && !teamData) {
    return (
      <div className="min-h-screen bg-ai-darker relative">
        <ParticleBackground particleCount={30} />
        <div className="relative container mx-auto px-4 py-8 max-w-7xl z-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loading size="lg" text="Loading your team..." />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ai-darker relative flex items-center justify-center px-4">
        <ParticleBackground particleCount={20} />
        <GlassCard className="max-w-md text-center relative z-10">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Team</h2>
          <p className="text-white/70 mb-4">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <AnimatedButton onClick={() => window.location.reload()}>Retry</AnimatedButton>
        </GlassCard>
      </div>
    )
  }

  const displayData = teamData || {
    total_points: 0,
    expected_points: 0,
    squad_value: 0,
    bank: 100,
    players: [],
    captain_id: null,
    vice_captain_id: null,
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
        >
          <source src="/stadium.mp4" type="video/mp4" />
        </video>
        {/* Overlay for better content readability */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-premier opacity-20" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl z-10">
        {/* Backend Connection Warning */}
        {error && ((error as any)?.code === 'ERR_NETWORK' || (error as any)?.code === 'ERR_CONNECTION_REFUSED') && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard className="border-yellow-500/50 bg-yellow-500/10">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-200 font-medium">
                    Backend not connected - showing placeholder data
                  </p>
                  <p className="text-xs text-yellow-300/70 mt-1">
                    Start the backend server to see real team data
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Header */}
        <SectionHeader
          title="My Team"
          subtitle={`${teamData?.season || "2024-25"} • Gameweek ${teamData?.gameweek || "—"}`}
          action={
            !teamId && (
              <AnimatedButton
                variant="outline"
                onClick={() => window.location.href = "/settings"}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configure Team ID
              </AnimatedButton>
            )
          }
        />

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Points"
            value={displayData.total_points.toFixed(1)}
            icon={TrendingUp}
            variant="success"
            glow
            delay={0.1}
          />
          <StatCard
            title="Squad Value"
            value={`£${displayData.squad_value.toFixed(1)}M`}
            icon={Target}
            glow
            delay={0.2}
          />
          <StatCard
            title="Expected Points"
            value={displayData.expected_points.toFixed(1)}
            icon={Target}
            glow
            delay={0.3}
          />
          <StatCard
            title="Bank"
            value={`£${displayData.bank.toFixed(1)}M`}
            icon={AlertCircle}
            variant={displayData.bank > 1 ? "success" : "warning"}
            glow
            delay={0.4}
          />
        </div>

        {/* No Team ID */}
        {!teamId && (
          <GlassCard className="mb-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Team ID Configured</h3>
              <p className="text-white/70 mb-4">
                Please add your FPL Team ID in Settings to view your team data.
              </p>
              <AnimatedButton 
                variant="primary" 
                onClick={() => window.location.href = "/settings"}
              >
                Go to Settings
              </AnimatedButton>
            </div>
          </GlassCard>
        )}
        
        {/* Error State */}
        {teamId && error && !isLoading && (
          <GlassCard className="mb-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Error Loading Team</h3>
              <p className="text-white/70 mb-4">
                Could not fetch team data for Team ID: {teamId}
              </p>
              <div className="flex gap-4 justify-center">
                <AnimatedButton variant="outline" onClick={() => window.location.reload()}>
                  Retry
                </AnimatedButton>
                <AnimatedButton 
                  variant="outline" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["my-team", teamId] })}
                >
                  Refresh
                </AnimatedButton>
              </div>
            </div>
          </GlassCard>
        )}
        
        {/* Empty Squad */}
        {teamId && teamData && teamData.players.length === 0 && !isLoading && !error && (
          <GlassCard className="mb-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Players Found</h3>
              <p className="text-white/70 mb-4">
                Team ID {teamId} was found but no players could be matched.
              </p>
            </div>
          </GlassCard>
        )}
        
        {/* Main Content - Team Display */}
        {teamId && teamData && teamData.players.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Pitch View */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard glow>
                <div className="flex items-center justify-between mb-4 p-4 border-b border-ai-primary/20">
                  <h2 className="text-2xl font-bold text-white">Formation</h2>
                  <select
                    value={formation.name}
                    onChange={(e) => {
                      const newFormation = FORMATIONS.find(f => f.name === e.target.value)
                      if (newFormation) setSelectedFormation(newFormation)
                    }}
                    className="glass rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-ai-primary"
                  >
                    {FORMATIONS.map(f => (
                      <option key={f.name} value={f.name} className="bg-ai-dark">
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-4">
                  <EnhancedPitch
                    players={startingXI}
                    formation={formation}
                    captainId={displayData.captain_id}
                    viceCaptainId={displayData.vice_captain_id}
                    selectedPlayerId={selectedPlayer?.id || null}
                    onPlayerClick={setSelectedPlayer}
                    onPlayerHover={setHoveredPlayer}
                  />
                </div>
              </GlassCard>

              {/* Bench */}
              <GlassCard glow>
                <EnhancedBenchView
                  players={bench}
                  captainId={displayData.captain_id}
                  viceCaptainId={displayData.vice_captain_id}
                  onPlayerClick={setSelectedPlayer}
                />
              </GlassCard>
            </div>

            {/* Player Details & Actions */}
            <div className="space-y-6">
              <EnhancedPlayerModal
                player={selectedPlayer}
                isCaptain={selectedPlayer?.id === displayData.captain_id}
                isViceCaptain={selectedPlayer?.id === displayData.vice_captain_id}
                onClose={() => setSelectedPlayer(null)}
                onSetCaptain={() => {
                  console.log("Set captain:", selectedPlayer?.id)
                }}
                onTransfer={() => {
                  console.log("Transfer player:", selectedPlayer?.id)
                }}
              />

              <AICopilotPanel selectedPlayer={selectedPlayer} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
