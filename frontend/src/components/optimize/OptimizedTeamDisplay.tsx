"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { EnhancedPitch } from "@/components/team/EnhancedPitch"
import { PlayerDetail, Formation, FORMATIONS } from "@/types/team"
import { cn } from "@/lib/utils"
import { 
  Trophy, TrendingUp, DollarSign, ArrowRightLeft, Users, 
  ChevronDown, Star, Zap, Target, Calendar, X, Shield,
  Swords, Activity, ExternalLink, Copy, Check
} from "lucide-react"
import { PlayerChip } from "@/components/team/PlayerChip"
import toast from "react-hot-toast"

interface UpcomingFixture {
  gameweek: number
  opponent: string
  opponent_short: string
  is_home: boolean
  difficulty: number
  kickoff_time?: string
}

interface OptimizedPlayer {
  id: number
  name: string
  position: string
  team: string
  team_short?: string
  price: number
  score: number
  expected_points: number
  is_starting_xi: boolean
  is_captain: boolean
  is_vice_captain: boolean
  upcoming_fixtures?: UpcomingFixture[]
}

interface SquadOption {
  squad: OptimizedPlayer[]
  starting_xi: OptimizedPlayer[]
  bench: OptimizedPlayer[]
  total_cost: number
  total_score: number
  xg_score: number
  formation: string
  transfers_made?: Array<{ out: number; in: number }> | null
  transfer_cost: number
  transfers_count: number
  xi_points?: number
  bench_points?: number
  captain_points?: number
  effective_points?: number
  chip?: string
}

interface OptimizedTeamDisplayProps {
  option: SquadOption
  index: number
  isExpanded: boolean
  onToggle: () => void
}

// Player Details Panel Component
const PlayerDetailsPanel: React.FC<{
  player: OptimizedPlayer | null
  onClose: () => void
}> = ({ player, onClose }) => {
  const router = useRouter()
  
  if (!player) return null
  
  // Calculate effective expected points (captain gets 2x)
  const effectiveExpectedPoints = player.is_captain 
    ? player.expected_points * 2 
    : player.expected_points

  // Estimate difficulty based on expected points
  const getDifficultyColor = (expectedPts: number) => {
    if (expectedPts >= 6) return "text-green-400 bg-green-500/20"
    if (expectedPts >= 4) return "text-yellow-400 bg-yellow-500/20"
    if (expectedPts >= 2) return "text-orange-400 bg-orange-500/20"
    return "text-red-400 bg-red-500/20"
  }

  const getPerformanceRating = (expectedPts: number) => {
    if (expectedPts >= 7) return { label: "Excellent", color: "text-green-400" }
    if (expectedPts >= 5) return { label: "Good", color: "text-emerald-400" }
    if (expectedPts >= 3) return { label: "Average", color: "text-yellow-400" }
    if (expectedPts >= 2) return { label: "Below Avg", color: "text-orange-400" }
    return { label: "Poor", color: "text-red-400" }
  }

  const rating = getPerformanceRating(player.expected_points)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, width: 0 }}
      animate={{ opacity: 1, x: 0, width: 280 }}
      exit={{ opacity: 0, x: -20, width: 0 }}
      transition={{ duration: 0.2 }}
      className="flex-shrink-0 border-r border-white/10 overflow-hidden"
    >
      <div className="p-4 h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-lg truncate">{player.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded bg-ai-primary/20 text-ai-primary font-medium">
                {player.position}
              </span>
              <span className="text-xs text-white/50">{player.team}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Captain/Vice Badge */}
        {(player.is_captain || player.is_vice_captain) && (
          <div className={cn(
            "mb-4 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
            player.is_captain 
              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
          )}>
            <Star className="h-4 w-4" />
            {player.is_captain ? "Captain (2x points)" : "Vice Captain"}
          </div>
        )}

        {/* Expected Performance */}
        <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-ai-primary" />
            <span className="text-xs text-white/60 uppercase tracking-wide">Expected Performance</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-3xl font-bold",
              player.is_captain ? "text-yellow-400" : "text-white"
            )}>
              {effectiveExpectedPoints.toFixed(2)}
            </span>
            <span className="text-sm text-white/50">pts</span>
            {player.is_captain && (
              <span className="text-xs text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded">
                2x
              </span>
            )}
          </div>
          {player.is_captain && (
            <div className="text-xs text-white/40 mt-1">
              Base: {player.expected_points.toFixed(2)} × 2 (Captain)
            </div>
          )}
          <div className={cn("text-sm font-medium mt-1", rating.color)}>
            {rating.label} outlook
          </div>
        </div>
        
        {/* View Full Stats Button */}
        <button
          onClick={() => router.push(`/player/${player.id}`)}
          className="w-full mb-4 p-2 rounded-lg bg-ai-primary/20 border border-ai-primary/30 
                     hover:bg-ai-primary/30 transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="h-4 w-4 text-ai-primary" />
          <span className="text-sm font-medium text-ai-primary">View Full Stats</span>
        </button>

        {/* Upcoming Fixtures */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-white/50" />
            <span className="text-xs text-white/60 uppercase tracking-wide">Upcoming Fixtures</span>
          </div>
          {player.upcoming_fixtures && player.upcoming_fixtures.length > 0 ? (
            <div className="space-y-2">
              {player.upcoming_fixtures.slice(0, 3).map((fixture, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">GW{fixture.gameweek}</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      fixture.is_home ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                    )}>
                      {fixture.is_home ? "H" : "A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium text-sm">
                      vs {fixture.opponent_short || fixture.opponent}
                    </span>
                    <div className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                      fixture.difficulty <= 2 ? "bg-green-500/30 text-green-400" :
                      fixture.difficulty === 3 ? "bg-yellow-500/30 text-yellow-400" :
                      fixture.difficulty === 4 ? "bg-orange-500/30 text-orange-400" :
                      "bg-red-500/30 text-red-400"
                    )}>
                      {fixture.difficulty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <span className="text-white/40 text-xs">No fixtures available</span>
            </div>
          )}
        </div>

        {/* Player Stats */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="h-4 w-4 text-white/50" />
            <span className="text-xs text-white/60 uppercase tracking-wide">Key Metrics</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-white/5 text-center">
              <div className="text-xs text-white/50">Price</div>
              <div className="text-sm font-bold text-white">£{player.price.toFixed(1)}m</div>
            </div>
            <div className="p-2 rounded-lg bg-white/5 text-center">
              <div className="text-xs text-white/50">XG Score</div>
              <div className="text-sm font-bold text-ai-primary">{player.score.toFixed(1)}</div>
            </div>
          </div>

          {/* Value Assessment */}
          <div className="p-2 rounded-lg bg-white/5">
            <div className="text-xs text-white/50 mb-1">Value Rating</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-ai-primary to-ai-secondary rounded-full"
                  style={{ width: `${Math.min((player.expected_points / player.price) * 20, 100)}%` }}
                />
              </div>
              <span className="text-xs text-white/70">
                {((player.expected_points / player.price) * 10).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="mt-4 p-3 rounded-xl bg-ai-primary/10 border border-ai-primary/20">
          <div className="text-xs text-ai-primary font-medium mb-1">AI Recommendation</div>
          <p className="text-xs text-white/70">
            {player.expected_points >= 5
              ? `Strong pick with ${player.expected_points.toFixed(1)} expected points. Good value at £${player.price.toFixed(1)}m.`
              : player.expected_points >= 3
              ? `Solid option. Monitor form and fixtures for optimal timing.`
              : `Consider alternatives. Lower expected return this gameweek.`
            }
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export const OptimizedTeamDisplay: React.FC<OptimizedTeamDisplayProps> = ({
  option,
  index,
  isExpanded,
  onToggle,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<OptimizedPlayer | null>(null)
  const [copied, setCopied] = useState(false)

  // Copy squad to clipboard as JSON for pasting in My Team
  const handleCopySquad = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    const squadData = {
      version: 1,
      formation: option.formation,
      squad: option.squad.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        team: p.team,
        price: p.price,
        is_captain: p.is_captain,
        is_vice_captain: p.is_vice_captain,
        is_starting_xi: p.is_starting_xi,
      })),
      transfers_count: option.transfers_count,
      total_cost: option.total_cost,
      effective_points: option.effective_points ?? option.total_score,
    }
    
    navigator.clipboard.writeText(JSON.stringify(squadData))
      .then(() => {
        setCopied(true)
        toast.success("Squad copied! Paste in My Team to apply.")
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        toast.error("Failed to copy squad")
      })
  }

  // Parse formation string to Formation object
  const parseFormation = (formationStr: string): Formation => {
    const parts = formationStr.split("-").map(Number)
    if (parts.length === 3) {
      return { name: formationStr, def: parts[0], mid: parts[1], fwd: parts[2] }
    }
    return FORMATIONS[0]
  }

  // Convert OptimizedPlayer to PlayerDetail for pitch display
  // Convert OptimizedPlayer to PlayerDetail - captain gets 2x expected points
  const toPlayerDetail = (player: OptimizedPlayer): PlayerDetail => {
    // Captain's expected points are doubled
    const effectivePoints = player.is_captain 
      ? player.expected_points * 2 
      : player.expected_points
    
    return {
      id: player.id,
      fpl_id: player.id,
      name: player.name,
      position: player.position as "GK" | "DEF" | "MID" | "FWD",
      team: player.team,
      team_short_name: player.team.slice(0, 3).toUpperCase(),
      price: player.price,
      status: "a",
      is_starting: player.is_starting_xi,
      is_captain: player.is_captain,
      is_vice_captain: player.is_vice_captain,
      total_points: effectivePoints * 10,  // Keep precision
      gw_points: effectivePoints,  // Captain gets 2x points displayed
      goals_scored: 0,
      assists: 0,
      clean_sheets: 0,
    }
  }

  const formation = parseFormation(option.formation)
  const startingPlayers = option.starting_xi.map(toPlayerDetail)
  const benchPlayers = option.bench.map(toPlayerDetail)
  const captain = startingPlayers.find(p => p.is_captain)
  const viceCaptain = startingPlayers.find(p => p.is_vice_captain)

  // Handle player click
  const handlePlayerClick = (playerDetail: PlayerDetail) => {
    const optimizedPlayer = option.squad.find(p => p.id === playerDetail.id)
    if (optimizedPlayer) {
      setSelectedPlayer(prev => prev?.id === optimizedPlayer.id ? null : optimizedPlayer)
    }
  }

  // Score color coding
  const getScoreStyle = (score: number) => {
    if (score >= 70) return { color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30" }
    if (score >= 50) return { color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30" }
    if (score >= 30) return { color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" }
    return { color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" }
  }

  const scoreStyle = getScoreStyle(option.xg_score)

  // Transfer badge style
  const getTransferStyle = (count: number, cost: number) => {
    if (count === 0) return "bg-green-500/20 text-green-400 border-green-500/30"
    if (cost === 0) return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    if (cost <= 4) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    return "bg-red-500/20 text-red-400 border-red-500/30"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "glass xg-noise rounded-2xl border overflow-hidden transition-all",
        isExpanded ? "border-ai-primary/50" : "border-white/10 hover:border-white/20"
      )}
    >
      {/* Collapsible Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm",
            index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-black" :
            index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black" :
            index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-black" :
            "bg-white/10 text-white/60"
          )}>
            #{index + 1}
          </div>

          {/* XG Score */}
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", scoreStyle.bg)}>
              <Trophy className={cn("h-4 w-4", scoreStyle.color)} />
            </div>
            <div>
              <div className={cn("text-xl font-bold", scoreStyle.color)}>
                {option.xg_score.toFixed(1)}
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide">XG Score</div>
            </div>
          </div>

          {/* Formation */}
          <div className="px-3 py-1.5 rounded-lg bg-ai-primary/15 border border-ai-primary/30">
            <span className="text-ai-primary font-semibold text-sm">{option.formation}</span>
          </div>

          {/* Transfers */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
            getTransferStyle(option.transfers_count, option.transfer_cost)
          )}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">
              {option.transfers_count} {option.transfers_count === 1 ? "transfer" : "transfers"}
            </span>
          </div>

          {/* Transfer Cost */}
          {option.transfer_cost > 0 && (
            <span className="text-red-400 text-sm font-medium">
              -{option.transfer_cost} pts
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Effective Points */}
          <div className="text-right hidden sm:block">
            <div className="text-ai-primary font-bold">{(option.effective_points ?? option.total_score).toFixed(2)} pts</div>
            <div className="text-[10px] text-white/40">Effective</div>
          </div>

          {/* Cost */}
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1 text-white/70">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-medium">£{option.total_cost.toFixed(1)}m</span>
            </div>
          </div>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-white/40" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="border-t border-white/10">
              {/* Main content with optional player panel */}
              <div className="flex">
                {/* Player Details Panel (left) */}
                <AnimatePresence>
                  {selectedPlayer && (
                    <PlayerDetailsPanel
                      player={selectedPlayer}
                      onClose={() => setSelectedPlayer(null)}
                    />
                  )}
                </AnimatePresence>

                {/* Pitch and content (right) */}
                <div className="flex-1 min-w-0">
                  {/* Pitch */}
                  <div className="p-4">
                    <div className="max-w-xl mx-auto">
                      <EnhancedPitch
                        players={startingPlayers}
                        formation={formation}
                        captainId={captain?.id}
                        viceCaptainId={viceCaptain?.id}
                        selectedPlayerId={selectedPlayer?.id}
                        onPlayerClick={handlePlayerClick}
                      />
                    </div>
                  </div>

                  {/* Bench */}
                  {benchPlayers.length > 0 && (
                    <div className="px-3 pb-3">
                      <div className="rounded-xl p-3 bg-black/20 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-3.5 w-3.5 text-white/50" />
                          <span className="text-xs font-medium text-white/70">Substitutes</span>
                        </div>
                        <div className="flex justify-center gap-3 flex-wrap">
                          {benchPlayers.map((player) => {
                            const optPlayer = option.bench.find(p => p.id === player.id)
                            return (
                              <div
                                key={player.id}
                                onClick={() => optPlayer && setSelectedPlayer(
                                  selectedPlayer?.id === optPlayer.id ? null : optPlayer
                                )}
                                className="cursor-pointer"
                              >
                                <PlayerChip
                                  player={player}
                                  isBench
                                  isCaptain={player.is_captain}
                                  isViceCaptain={player.is_vice_captain}
                                  isSelected={selectedPlayer?.id === player.id}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-5 gap-2">
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className="text-base font-bold text-white">{(option.xi_points ?? option.total_score).toFixed(2)}</div>
                        <div className="text-[9px] text-white/40 uppercase">XI Pts</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className="text-base font-bold text-yellow-400">+{(option.captain_points ?? 0).toFixed(2)}</div>
                        <div className="text-[9px] text-white/40 uppercase">Captain</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className={cn(
                          "text-base font-bold",
                          option.chip?.toLowerCase() === "bench_boost" ? "text-green-400" : "text-white/50"
                        )}>
                          {option.chip?.toLowerCase() === "bench_boost" ? "+" : ""}{(option.bench_points ?? 0).toFixed(2)}
                        </div>
                        <div className="text-[9px] text-white/40 uppercase">Bench</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className={cn(
                          "text-base font-bold",
                          option.transfer_cost > 0 ? "text-red-400" : "text-white/50"
                        )}>
                          {option.transfer_cost > 0 ? `-${option.transfer_cost}` : "0"}
                        </div>
                        <div className="text-[9px] text-white/40 uppercase">Hit</div>
                      </div>
                      <div className="rounded-lg bg-ai-primary/20 p-2 text-center border border-ai-primary/30">
                        <div className="text-base font-bold text-ai-primary">{(option.effective_points ?? option.total_score).toFixed(2)}</div>
                        <div className="text-[9px] text-ai-primary/70 uppercase">Total</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Copy Squad Button */}
                  <div className="px-3 pb-4">
                    <button
                      onClick={handleCopySquad}
                      className={cn(
                        "w-full py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all",
                        copied 
                          ? "bg-green-500/20 border border-green-500/30 text-green-400"
                          : "bg-ai-primary/20 border border-ai-primary/30 text-ai-primary hover:bg-ai-primary/30"
                      )}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span className="font-medium">Copy Squad to My Team</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Compact card for grid view
export const OptimizedTeamCard: React.FC<{
  option: SquadOption
  index: number
  isSelected: boolean
  onSelect: () => void
}> = ({ option, index, isSelected, onSelect }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-400"
    if (score >= 50) return "text-yellow-400"
    if (score >= 30) return "text-orange-400"
    return "text-red-400"
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "p-4 rounded-xl border-2 transition-all text-left w-full",
        isSelected
          ? "border-ai-primary bg-ai-primary/10"
          : "border-white/10 bg-black/30 hover:border-white/20"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs",
          index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-black" :
          "bg-white/10 text-white/60"
        )}>
          #{index + 1}
        </div>
        <Star className={cn("h-4 w-4", isSelected ? "text-ai-primary" : "text-white/20")} />
      </div>

      <div className={cn("flex items-baseline gap-1 mb-2", getScoreColor(option.xg_score))}>
        <span className="text-2xl font-bold">{option.xg_score.toFixed(1)}</span>
        <span className="text-xs text-white/40">/100</span>
      </div>

      <div className="flex items-center gap-2 text-xs mb-2">
        <span className="px-2 py-0.5 rounded bg-ai-primary/20 text-ai-primary font-medium">
          {option.formation}
        </span>
        <span className={cn(
          "px-2 py-0.5 rounded",
          option.transfers_count === 0 ? "bg-green-500/20 text-green-400" :
          option.transfer_cost <= 4 ? "bg-yellow-500/20 text-yellow-400" :
          "bg-red-500/20 text-red-400"
        )}>
          {option.transfers_count}T
          {option.transfer_cost > 0 && ` (-${option.transfer_cost})`}
        </span>
      </div>

      <div className="text-sm text-white/60">
        {option.total_score.toFixed(0)} pts • £{option.total_cost.toFixed(1)}m
      </div>
    </motion.button>
  )
}
