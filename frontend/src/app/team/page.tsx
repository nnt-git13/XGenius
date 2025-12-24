"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, Target, TrendingUp, Settings, ChevronLeft, ChevronRight, ClipboardPaste, X, ArrowRightLeft, UserPlus } from "lucide-react"
import { api } from "@/lib/api"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { Loading } from "@/components/ui/Loading"
import { StatCard } from "@/components/charts/StatCard"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { useAppStore } from "@/store/useAppStore"
import { useTransferStore } from "@/store/useTransferStore"
import { TeamEvaluationResponse, PlayerDetail, FORMATIONS, Formation } from "@/types/team"
import { PitchCard } from "@/components/team/PitchCard"
import { EnhancedBenchView } from "@/components/team/EnhancedBenchView"
import { PlayerDetailsPanel } from "@/components/team/PlayerDetailsPanel"
import { CopilotPanel } from "@/components/team/CopilotPanel"
import { TransferSuggestionsModal } from "@/components/team/TransferSuggestionsModal"
import { WatchlistPanel } from "@/components/team/WatchlistPanel"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

// Detect formation from player positions
const detectFormation = (players: PlayerDetail[]): Formation => {
  const def = players.filter(p => p.position === "DEF").length
  const mid = players.filter(p => p.position === "MID").length
  const fwd = players.filter(p => p.position === "FWD").length
  
  const formation = FORMATIONS.find(f => f.def === def && f.mid === mid && f.fwd === fwd)
  return formation || FORMATIONS[0]
}

export default function MyTeamPage() {
  const season = "2025-26"
  const { teamId } = useAppStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null)
  const [hoveredPlayer, setHoveredPlayer] = useState<PlayerDetail | null>(null)
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null)
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null) // null = latest gameweek
  // Local “in-page actions” overrides (captain + transfers) for current/upcoming gameweeks
  const [localPlayers, setLocalPlayers] = useState<PlayerDetail[] | null>(null)
  const [localBank, setLocalBank] = useState<number | null>(null)
  const [localCaptainId, setLocalCaptainId] = useState<number | null>(null)
  const [localViceCaptainId, setLocalViceCaptainId] = useState<number | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferOut, setTransferOut] = useState<PlayerDetail | null>(null)
  const [transferOriginalByIndex, setTransferOriginalByIndex] = useState<Record<number, PlayerDetail>>({})
  
  // Paste squad from optimizer
  const [showPastePreview, setShowPastePreview] = useState(false)
  const [pastedSquadData, setPastedSquadData] = useState<any>(null)
  
  // Transfer from transfers page
  const pendingTransferIn = useTransferStore((s) => s.pendingTransferIn)
  const clearPendingTransfer = useTransferStore((s) => s.clearPendingTransfer)
  const [transferMode, setTransferMode] = useState(false)

  // Handle paste squad from clipboard
  const handlePasteSquad = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const data = JSON.parse(text)
      
      // Validate the pasted data
      if (!data.version || !data.squad || !Array.isArray(data.squad) || data.squad.length !== 15) {
        toast.error("Invalid squad data. Please copy a squad from the Optimizer.")
        return
      }
      
      setPastedSquadData(data)
      setShowPastePreview(true)
      toast.success(`Squad loaded: ${data.formation} formation with ${data.transfers_count} transfers`)
    } catch (e) {
      toast.error("Could not read squad from clipboard. Copy a squad from the Optimizer first.")
    }
  }

  // Apply pasted squad
  const applyPastedSquad = () => {
    if (!pastedSquadData || !pastedSquadData.squad) return
    
    // Convert pasted players to PlayerDetail format
    const newPlayers: PlayerDetail[] = pastedSquadData.squad.map((p: any) => ({
      id: p.id,
      fpl_id: p.id,
      name: p.name,
      position: p.position as "GK" | "DEF" | "MID" | "FWD",
      team: p.team,
      team_short_name: p.team?.slice(0, 3).toUpperCase() || "UNK",
      price: p.price,
      status: "a",
      is_starting: p.is_starting_xi,
      is_captain: p.is_captain,
      is_vice_captain: p.is_vice_captain,
      total_points: 0,
      goals_scored: 0,
      assists: 0,
      clean_sheets: 0,
    }))
    
    // Find captain and vice captain
    const captainPlayer = newPlayers.find(p => p.is_captain)
    const viceCaptainPlayer = newPlayers.find(p => p.is_vice_captain)
    
    // Set local state
    setLocalPlayers(newPlayers)
    if (captainPlayer) setLocalCaptainId(captainPlayer.id)
    if (viceCaptainPlayer) setLocalViceCaptainId(viceCaptainPlayer.id)
    
    // Set formation
    const formationName = pastedSquadData.formation
    const formation = FORMATIONS.find(f => f.name === formationName)
    if (formation) setSelectedFormation(formation)
    
    setShowPastePreview(false)
    setPastedSquadData(null)
    toast.success("Squad applied! Review the changes and save when ready.")
  }

  // Restore scroll position when navigating back from player/compare pages.
  useEffect(() => {
    if (typeof window === "undefined") return
    const key = `xg:scroll:${window.location.pathname}${window.location.search}${window.location.hash}`
    const v = sessionStorage.getItem(key)
    if (v == null) return
    sessionStorage.removeItem(key)
    const y = Number(v)
    if (!Number.isFinite(y)) return
    // Wait a tick so layout is ready.
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }))
  }, [])


  // Apply transfer from transfers page
  const applyPendingTransfer = (outPlayer: PlayerDetail) => {
    if (!pendingTransferIn) return
    
    // Check position match
    if (outPlayer.position !== pendingTransferIn.position) {
      toast.error(`Position mismatch: ${pendingTransferIn.name} (${pendingTransferIn.position}) cannot replace ${outPlayer.name} (${outPlayer.position})`)
      return
    }
    
    // Check budget
    const currentBank = localBank ?? (teamData?.bank || 0)
    const priceDiff = pendingTransferIn.price - outPlayer.price
    if (priceDiff > currentBank) {
      toast.error(`Not enough budget: need £${priceDiff.toFixed(1)}m more`)
      return
    }
    
    // Create new player from pending transfer
    const newPlayer: PlayerDetail = {
      id: pendingTransferIn.fpl_id,
      fpl_id: pendingTransferIn.fpl_id,
      name: pendingTransferIn.name,
      position: pendingTransferIn.position,
      team: pendingTransferIn.team,
      team_short_name: pendingTransferIn.team_short_name,
      price: pendingTransferIn.price,
      status: "a",
      is_starting: outPlayer.is_starting,
      is_captain: false,
      is_vice_captain: false,
      total_points: pendingTransferIn.total_points,
      goals_scored: pendingTransferIn.goals_scored,
      assists: pendingTransferIn.assists,
      clean_sheets: 0,
    }
    
    // Apply the transfer
    const basePlayers = (localPlayers ?? displayData?.players ?? []) as PlayerDetail[]
    const idx = basePlayers.findIndex((p) => p.id === outPlayer.id)
    if (idx < 0) {
      toast.error("Player not found in squad")
      return
    }
    
    // Store original for potential revert
    setTransferOriginalByIndex((prev) => ({ ...prev, [idx]: outPlayer }))
    
    // Replace player
    const updated = [...basePlayers]
    updated[idx] = newPlayer
    setLocalPlayers(updated)
    
    // Update bank
    setLocalBank(currentBank - priceDiff)
    
    // Clear pending transfer
    clearPendingTransfer()
    setTransferMode(false)
    
    toast.success(`Transferred ${outPlayer.name} → ${pendingTransferIn.name}`)
  }

  // Cancel pending transfer
  const cancelPendingTransfer = () => {
    clearPendingTransfer()
    setTransferMode(false)
    toast("Transfer cancelled")
  }

  const BackgroundVideo = (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover opacity-50"
      >
        <source src="/stadium.mp4" type="video/mp4" />
        <source src="/background.mp4" type="video/mp4" />
      </video>
      {/* Dark overlays so text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,255,133,0.12)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.12)_0%,transparent_60%)]" />
    </div>
  )
  
  // Track the latest gameweek separately
  const [latestGameweek, setLatestGameweek] = useState<number | null>(null)
  
  // Track if we're switching gameweeks
  const [isSwitchingGameweek, setIsSwitchingGameweek] = useState(false)
  const [previousGameweek, setPreviousGameweek] = useState<number | null>(null)

  // If we navigated back from player profile, always reset to the latest/current gameweek.
  // Also handle gw=upcoming for transfer mode
  useEffect(() => {
    const gwParam = searchParams.get("gw")
    const modeParam = searchParams.get("mode")
    
    if (gwParam === "latest") {
      setSelectedGameweek(null)
      setIsSwitchingGameweek(false)
      // Reset local overrides when explicitly returning to latest
      setLocalPlayers(null)
      setLocalBank(null)
      setLocalCaptainId(null)
      // Clean the URL so refresh/bookmarks don't keep forcing resets.
      router.replace("/team")
    } else if (gwParam === "upcoming") {
      // Navigate to upcoming gameweek (for transfers)
      // We need to wait for uiUpcomingGw to be available, handled in separate effect
      if (modeParam === "transfer" && pendingTransferIn) {
        setTransferMode(true)
      }
    }
  }, [searchParams, router])

  // Fetch FPL bootstrap-static early (we use its deadline info to compute upcoming/latest GW)
  // This doesn't require teamId - it's general FPL data
  const { data: fplBootstrap, isLoading: isLoadingBootstrap } = useQuery({
    queryKey: ["fpl-bootstrap-static-lite"],
    queryFn: () => api.getFplBootstrapStatic(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const { uiLatestGw, uiUpcomingGw } = useMemo(() => {
    // Use the same source of truth as the official deadline countdown:
    // - `events[].deadline_time` and `events[].is_next`
    const events = (fplBootstrap?.events || []) as any[]
    const now = Date.now()

    const nextByFlag = events.find((e) => e?.is_next)?.id
    let nextByDeadline: number | null = null
    for (const e of events) {
      if (!e?.deadline_time || !e?.id) continue
      const t = Date.parse(String(e.deadline_time))
      if (!Number.isFinite(t)) continue
      if (t > now) {
        const id = Number(e.id)
        nextByDeadline = nextByDeadline == null ? id : Math.min(nextByDeadline, id)
      }
    }

    const upcoming = (nextByFlag ?? nextByDeadline) != null ? Number(nextByFlag ?? nextByDeadline) : null

    const current = events.find((e) => e?.is_current)?.id
    const finishedIds = events
      .filter((e) => e?.finished && e?.id)
      .map((e) => Number(e.id))
      .filter((n) => Number.isFinite(n))

    const latest =
      current != null
        ? Number(current)
        : finishedIds.length
          ? Math.max(...finishedIds)
          : upcoming != null
            ? Math.max(1, upcoming - 1)
            : 1

    const upcomingGw = upcoming != null ? upcoming : Math.min(38, latest + 1)
    return { uiLatestGw: latest, uiUpcomingGw: upcomingGw }
  }, [fplBootstrap])
  
  // Calculate what gameweek to fetch based on selectedGameweek
  // If selectedGameweek is current + 1 (upcoming), we'll fetch current gameweek's team
  // We need to determine this after we have the latest gameweek, but we can use a helper
  const getGameweekToFetch = (selectedGw: number | null, latestGw: number | null, upcomingGw: number | null): number | undefined => {
    if (selectedGw === null) return undefined // Latest
    if (latestGw === null) return selectedGw || undefined
    // If selected is upcoming (next deadline), fetch latest team snapshot and treat as preview
    if (upcomingGw !== null && selectedGw === upcomingGw) return latestGw
    return selectedGw
  }
  
  const gameweekToFetch = getGameweekToFetch(selectedGameweek, latestGameweek, uiUpcomingGw ?? null)
  
  // Handle transfer mode from transfers page
  useEffect(() => {
    const mode = searchParams.get("mode")
    const gwParam = searchParams.get("gw")
    
    // If coming from transfers page with a pending transfer
    // Wait for fplBootstrap to be fully loaded (uiUpcomingGw will be valid)
    if ((mode === "transfer" || gwParam === "upcoming") && pendingTransferIn && fplBootstrap && uiUpcomingGw) {
      setTransferMode(true)
      // Navigate to upcoming gameweek
      setSelectedGameweek(uiUpcomingGw)
      // Clear the URL params after processing
      router.replace("/team")
    }
  }, [searchParams, pendingTransferIn, fplBootstrap, uiUpcomingGw, router])

  // Detect gameweek changes
  useEffect(() => {
    if (selectedGameweek !== previousGameweek && previousGameweek !== null) {
      setIsSwitchingGameweek(true)
    }
    setPreviousGameweek(selectedGameweek)
  }, [selectedGameweek, previousGameweek])
  
  // Fetch team data for selected gameweek (null = latest)
  const { data: teamData, isLoading, error, isFetching } = useQuery<TeamEvaluationResponse>({
    queryKey: ["my-team", teamId, season, gameweekToFetch],
    queryFn: async () => {
      const gwToFetch = getGameweekToFetch(selectedGameweek, latestGameweek, uiUpcomingGw ?? null)
      const data = await api.evaluateTeam({ 
        season,
        team_id: teamId || undefined,
        gameweek: gwToFetch, // undefined = latest gameweek
      }) as TeamEvaluationResponse
      
      // Data loaded, stop showing switching state
      setIsSwitchingGameweek(false)
      return data
    },
    enabled: !!teamId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 0,
    placeholderData: {
      season,
      gameweek: selectedGameweek,
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

  // Initialize selectedGameweek to latest gameweek when data loads
  useEffect(() => {
    if (teamData?.gameweek !== null && teamData?.gameweek !== undefined && selectedGameweek === null) {
      setSelectedGameweek(teamData.gameweek)
      setLatestGameweek(teamData.gameweek)
    }
  }, [teamData?.gameweek, selectedGameweek])

  // Stop showing switching state once we're no longer fetching.
  // Important: selecting the "upcoming" gameweek does NOT trigger a refetch
  // (we intentionally reuse the latest GW data), so we must clear the switching
  // flag on selection change as well to avoid an infinite loading screen.
  useEffect(() => {
    if (!isFetching) {
      setIsSwitchingGameweek(false)
    }
  }, [isFetching, selectedGameweek])

  // Calculate statuses:
  // - Latest (read-only) = uiLatestGw (often the locked/current GW after deadline)
  // - Upcoming (editable) = uiUpcomingGw (the next deadline GW)
  const isUpcomingGameweek = selectedGameweek !== null && selectedGameweek === uiUpcomingGw
  const isPreviousGameweek = selectedGameweek !== null && selectedGameweek < uiLatestGw
  // Allow actions only for the upcoming (next-deadline) GW.
  const actionsDisabled = !isUpcomingGameweek
  const minGameweek = 1
  const maxGameweek = uiUpcomingGw // Allow up to the upcoming GW
  
  // Transform data for upcoming gameweek
  const displayTeamData = useMemo(() => {
    if (!teamData) return null
    if (isUpcomingGameweek) {
      return {
        ...teamData,
        gameweek: uiUpcomingGw,
        total_points: 0, // No points yet for upcoming
      }
    }
    return teamData
  }, [teamData, isUpcomingGameweek, uiUpcomingGw])

  // Apply local overrides (captain/transfers/bank) on top of API data
  const displayData = useMemo(() => {
    const base = displayTeamData || teamData
    if (!base) {
      return {
        total_points: 0,
        expected_points: 0,
        squad_value: 0,
        bank: 100,
        players: [],
        captain_id: null,
        vice_captain_id: null,
      } as any
    }
    // Only apply draft overrides for current/upcoming views. Previous gameweeks are read-only snapshots.
    const applyDraft = !actionsDisabled
    const players = applyDraft ? (localPlayers ?? (base.players || [])) : (base.players || [])
    const bank = applyDraft ? (localBank ?? (base.bank ?? 0)) : (base.bank ?? 0)
    const captain_id = applyDraft ? (localCaptainId ?? base.captain_id) : base.captain_id
    const vice_captain_id = applyDraft ? (localViceCaptainId ?? base.vice_captain_id) : base.vice_captain_id
    return { ...base, players, bank, captain_id, vice_captain_id }
  }, [displayTeamData, teamData, localPlayers, localBank, localCaptainId, localViceCaptainId, actionsDisabled])
  
  const handlePreviousGameweek = () => {
    if (selectedGameweek === null) {
      // If viewing latest, go to latest - 1
      setSelectedGameweek(Math.max(minGameweek, uiLatestGw - 1))
    } else if (selectedGameweek === uiUpcomingGw) {
      // If viewing upcoming, go to current
      setSelectedGameweek(uiLatestGw)
    } else {
      setSelectedGameweek(Math.max(minGameweek, selectedGameweek - 1))
    }
  }

  const handleNextGameweek = () => {
    if (selectedGameweek === null) {
      // Go to upcoming gameweek
      setSelectedGameweek(uiUpcomingGw)
    } else if (selectedGameweek < uiUpcomingGw) {
      setSelectedGameweek(Math.min(maxGameweek, selectedGameweek + 1))
    }
    // Already at max, do nothing
  }

  const handleGameweekSelect = (gw: number | null) => {
    if (gw === "upcoming") {
      setSelectedGameweek(uiUpcomingGw)
    } else {
      setSelectedGameweek(gw)
    }
  }

  const { startingXI, bench } = useMemo(() => {
    const dataToUse = displayData
    if (!dataToUse?.players || dataToUse.players.length === 0) {
      return { startingXI: [], bench: [] }
    }
    
    // For upcoming gameweek, reset points to 0
    const allPlayers = isUpcomingGameweek
      ? dataToUse.players.map(p => ({
          ...p,
          gw_points: 0,
          gw_points_raw: 0,
          total_points: p.total_points, // Keep season total
        }))
      : dataToUse.players
    
    const startingXI = allPlayers.filter(p => p.is_starting).slice(0, 11)
    const bench = allPlayers.filter(p => !p.is_starting).slice(0, 4)
    
    return { startingXI, bench }
  }, [displayData, isUpcomingGameweek])

  const formation = useMemo(() => {
    if (selectedFormation) return selectedFormation
    if (startingXI.length > 0) return detectFormation(startingXI)
    return FORMATIONS[0]
  }, [startingXI, selectedFormation])

  const transferredInIds = useMemo(() => {
    // Only highlight when draft applies (current/upcoming)
    if (actionsDisabled) return new Set<number>()
    const next = new Set<number>()
    for (const idxStr of Object.keys(transferOriginalByIndex)) {
      const idx = Number(idxStr)
      const p = (localPlayers ?? displayData.players ?? [])[idx]
      if (p) next.add(p.id)
    }
    return next
  }, [actionsDisabled, transferOriginalByIndex, localPlayers, displayData.players])

  const applyTransfer = (outP: PlayerDetail, inP: PlayerDetail) => {
    // Draft transfers only make sense on current/upcoming views.
    if (actionsDisabled) return
    const basePlayers = (localPlayers ?? (displayTeamData || teamData)?.players ?? []) as PlayerDetail[]
    const idx = basePlayers.findIndex((p) => p.id === outP.id)
    if (idx < 0) return

    const next = [...basePlayers]
    // Save the original player for this slot so user can revert later.
    setTransferOriginalByIndex((prev) => {
      if (prev[idx]) return prev
      return { ...prev, [idx]: outP }
    })
    next[idx] = {
      ...inP,
      is_starting: outP.is_starting,
      multiplier: outP.multiplier,
      is_captain: false,
      is_vice_captain: false,
    }

    // Adjust local bank
    const bankNow = Number(localBank ?? displayData.bank ?? 0)
    const newBank = bankNow + Number(outP.price || 0) - Number(inP.price || 0)
    setLocalPlayers(next)
    setLocalBank(Number.isFinite(newBank) ? Math.max(0, newBank) : bankNow)

    // If the transferred-out player was captain, keep captain on the incoming by default (feels intuitive)
    const cap = Number(localCaptainId ?? displayData.captain_id ?? 0)
    if (cap && cap === outP.id) setLocalCaptainId(inP.id)
    const vc = Number(localViceCaptainId ?? displayData.vice_captain_id ?? 0)
    if (vc && vc === outP.id) setLocalViceCaptainId(inP.id)

    // Update selection
    setSelectedPlayer(next[idx])
  }

  // Show message if no team ID is configured
  if (!teamId) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-black">
        {BackgroundVideo}
        <div className="relative container mx-auto px-4 py-10 max-w-6xl z-10">
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

  // Show loading when initially loading or switching gameweeks
  // Also show loading when in transfer mode and bootstrap hasn't loaded yet
  const showLoading = (isLoading && !teamData) || isSwitchingGameweek || 
    (pendingTransferIn && isLoadingBootstrap)
  
  if (showLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-black">
        {BackgroundVideo}
        <div className="relative container mx-auto px-4 py-10 max-w-6xl z-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loading size="lg" text={
              pendingTransferIn ? "Preparing transfer..." :
              isSwitchingGameweek ? `Loading Gameweek ${selectedGameweek || uiLatestGw}...` : 
              "Loading your team..."
            } />
          </div>
        </div>
      </div>
    )
  }

  // NOTE:
  // We intentionally do NOT hard-fail the entire page on `error` here.
  // The UI below can still render with placeholder data and show a connection warning.

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Stadium video background */}
      {BackgroundVideo}

      <div className="relative container mx-auto px-4 py-10 max-w-6xl z-10">
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

        {/* Header with Gameweek Navigation */}
        <div className="flex items-center justify-between mb-6">
          <SectionHeader
            title="My Team"
            subtitle={`${teamData?.season || season} • ${isUpcomingGameweek ? "Upcoming Gameweek" : `Gameweek ${uiLatestGw}${selectedGameweek === null ? " (Latest)" : ""}`}`}
          />
          
          {/* Gameweek Navigation Controls */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePreviousGameweek}
              disabled={selectedGameweek !== null && selectedGameweek <= minGameweek}
              className={cn(
                "p-2 rounded-lg border transition-all",
                selectedGameweek !== null && selectedGameweek <= minGameweek
                  ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                  : "border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30"
              )}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </motion.button>
            
            <div className="flex items-center gap-2">
              <select
                value={isUpcomingGameweek ? "upcoming" : (selectedGameweek ?? "latest")}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "latest") {
                    handleGameweekSelect(null)
                  } else if (value === "upcoming") {
                    handleGameweekSelect(uiUpcomingGw)
                  } else {
                    handleGameweekSelect(parseInt(value, 10))
                  }
                }}
                className="px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white text-sm font-medium hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-ai-primary/50 focus:border-ai-primary/50 transition-all"
              >
                <option value="latest">Latest (GW {uiLatestGw})</option>
                {Array.from({ length: uiLatestGw }, (_, i) => i + 1).map((gw) => (
                  <option key={gw} value={gw} className="bg-gray-900">
                    Gameweek {gw}
                  </option>
                ))}
                <option value="upcoming" className="bg-gray-900 font-semibold">
                  Upcoming (GW {uiUpcomingGw})
                </option>
              </select>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextGameweek}
              disabled={selectedGameweek !== null && selectedGameweek >= maxGameweek}
              className={cn(
                "p-2 rounded-lg border transition-all",
                selectedGameweek !== null && selectedGameweek >= maxGameweek
                  ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                  : "border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30"
              )}
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </motion.button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="GW Points"
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
        {teamId && teamData && teamData.players.length === 0 && !isLoading && !isSwitchingGameweek && !error && (
          <GlassCard className="mb-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Players Found</h3>
              <p className="text-white/70 mb-4">
                Team ID {teamId} was found but no players could be matched for Gameweek {teamData.gameweek || selectedGameweek || uiLatestGw}.
              </p>
            </div>
          </GlassCard>
        )}
        
        {/* Main Content - Team Display */}
        {teamId && teamData && teamData.players.length > 0 && !isSwitchingGameweek && (
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
            {/* Pitch View */}
            <div className="space-y-6">
              {/* Transfer Mode Banner */}
              {transferMode && pendingTransferIn && (
                <GlassCard className="mb-4 border-green-500/30 bg-green-500/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-500/20">
                      <UserPlus className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        Transfer In: <span className="text-green-400">{pendingTransferIn.name}</span>
                        <span className="text-white/60 text-sm">({pendingTransferIn.position} • £{pendingTransferIn.price.toFixed(1)}m)</span>
                      </h3>
                      <p className="text-white/70 text-sm mt-1">
                        Click on a <span className="text-green-400 font-medium">{pendingTransferIn.position}</span> to replace them with {pendingTransferIn.name}
                      </p>
                    </div>
                    <button
                      onClick={cancelPendingTransfer}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 
                                 hover:bg-red-500/30 transition-colors text-red-400"
                    >
                      <X className="h-4 w-4" />
                      <span className="text-sm font-medium">Cancel</span>
                    </button>
                  </div>
                </GlassCard>
              )}

              {isUpcomingGameweek && !transferMode && (
                <GlassCard className="mb-4 border-ai-primary/30 bg-ai-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">Upcoming Gameweek Mode</h3>
                      <p className="text-white/70 text-sm mt-1">
                        This is a preview of your team for the next gameweek. Click players to transfer them in or out.
                      </p>
                    </div>
                    {/* Paste Squad Button */}
                    <button
                      onClick={handlePasteSquad}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 
                                 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                      title="Paste squad from Optimizer"
                    >
                      <ClipboardPaste className="h-4 w-4" />
                      <span className="text-sm font-medium">Paste Squad</span>
                    </button>
                  </div>
                </GlassCard>
              )}
              <PitchCard
                players={startingXI}
                formation={formation}
                formationOptions={FORMATIONS}
                onFormationChange={isUpcomingGameweek ? (name) => {
                  const newFormation = FORMATIONS.find((f) => f.name === name)
                  if (newFormation) setSelectedFormation(newFormation)
                } : undefined}
                captainId={displayData.captain_id}
                viceCaptainId={displayData.vice_captain_id}
                highlightedPlayerIds={transferredInIds}
                selectedPlayerId={selectedPlayer?.id || null}
                onPlayerClick={(player) => {
                  if (transferMode && pendingTransferIn) {
                    // In transfer mode, clicking applies the transfer
                    applyPendingTransfer(player)
                  } else {
                    setSelectedPlayer(player)
                  }
                }}
                onPlayerHover={setHoveredPlayer}
                subtitle={transferMode && pendingTransferIn
                  ? `Click a ${pendingTransferIn.position} to replace with ${pendingTransferIn.name}`
                  : isUpcomingGameweek 
                    ? "Upcoming Gameweek • Click players to transfer" 
                    : `Gameweek ${uiLatestGw}${selectedGameweek === null ? " (Latest)" : ""} • XI positions animate on formation change`}
              />

              {/* Bench */}
              <div className="glass xg-noise rounded-2xl border border-white/10 shadow-xg-card p-5">
                <EnhancedBenchView
                  players={bench}
                  captainId={displayData.captain_id}
                  viceCaptainId={displayData.vice_captain_id}
                  highlightedPlayerIds={transferredInIds}
                  onPlayerClick={(player) => {
                    if (transferMode && pendingTransferIn) {
                      applyPendingTransfer(player)
                    } else {
                      setSelectedPlayer(player)
                    }
                  }}
                />
              </div>
            </div>

            {/* Player Details & Copilot */}
            <div className="space-y-6">
              <PlayerDetailsPanel
                player={selectedPlayer}
                isCaptain={selectedPlayer?.id === displayData.captain_id}
                isViceCaptain={selectedPlayer?.id === displayData.vice_captain_id}
                onSetCaptain={() => {
                  if (!selectedPlayer) return
                  const prevCaptain = (localCaptainId ?? displayData.captain_id) as number | null
                  const prevVice = (localViceCaptainId ?? displayData.vice_captain_id) as number | null
                  const nextCaptain = selectedPlayer.id

                  // If selecting the vice as captain, swap vice -> previous captain.
                  if (prevVice && nextCaptain === prevVice) {
                    setLocalViceCaptainId(prevCaptain && prevCaptain !== nextCaptain ? prevCaptain : null)
                  }
                  setLocalCaptainId(nextCaptain)
                  // Ensure vice != captain
                  const nextVice = (localViceCaptainId ?? displayData.vice_captain_id) as number | null
                  if (nextVice && nextVice === nextCaptain) {
                    setLocalViceCaptainId(prevCaptain && prevCaptain !== nextCaptain ? prevCaptain : null)
                  }
                }}
                onSetViceCaptain={() => {
                  if (!selectedPlayer) return
                  const currCaptain = (localCaptainId ?? displayData.captain_id) as number | null
                  if (currCaptain && selectedPlayer.id === currCaptain) return
                  setLocalViceCaptainId(selectedPlayer.id)
                }}
                onTransfer={() => {
                  if (!selectedPlayer) return
                  // Open in-page transfer suggestions (no navigation)
                  setTransferOut(selectedPlayer)
                  setTransferOpen(true)
                }}
                actionsDisabled={actionsDisabled}
                actionsDisabledLabel={isUpcomingGameweek ? "Choose transfers/captain for the upcoming deadline GW" : "Deadline passed — read-only"}
              />

              <WatchlistPanel />
              <CopilotPanel selectedPlayer={selectedPlayer} />
            </div>
          </div>
        )}
      </div>

      {/* Transfer suggestions modal (current/upcoming only) */}
      <TransferSuggestionsModal
        isOpen={transferOpen && !actionsDisabled}
        onClose={() => {
          setTransferOpen(false)
          setTransferOut(null)
        }}
        outPlayer={transferOut}
        revertPlayer={
          transferOut
            ? (() => {
                const basePlayers = (localPlayers ?? displayData.players ?? []) as PlayerDetail[]
                const idx = basePlayers.findIndex((p) => p.id === transferOut.id)
                return idx >= 0 ? (transferOriginalByIndex[idx] ?? null) : null
              })()
            : null
        }
        squadPlayers={(localPlayers ?? displayData.players ?? []) as PlayerDetail[]}
        bank={Number(localBank ?? displayData.bank ?? 0)}
        onSelectInPlayer={(p) => {
          if (!transferOut) return
          applyTransfer(transferOut, p)
          setTransferOpen(false)
          setTransferOut(null)
        }}
      />

      {/* Paste Squad Preview Modal */}
      <AnimatePresence>
        {showPastePreview && pastedSquadData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPastePreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-ai-darker rounded-2xl border border-white/20 p-6 max-w-lg w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Apply Optimized Squad?</h3>
                <button
                  onClick={() => setShowPastePreview(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white/60 text-sm">Formation</div>
                    <div className="text-xl font-bold text-ai-primary">{pastedSquadData.formation}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white/60 text-sm">Transfers</div>
                    <div className="text-xl font-bold text-white">{pastedSquadData.transfers_count}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white/60 text-sm">Total Cost</div>
                    <div className="text-xl font-bold text-white">£{pastedSquadData.total_cost?.toFixed(1)}m</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white/60 text-sm">Expected Pts</div>
                    <div className="text-xl font-bold text-green-400">{pastedSquadData.effective_points?.toFixed(2)}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-ai-primary/10 border border-ai-primary/30">
                  <div className="text-white/80 text-sm">
                    <strong className="text-ai-primary">Note:</strong> This will replace your current team preview with the optimized squad.
                    You can still make further changes before confirming.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPastePreview(false)}
                  className="flex-1 py-3 rounded-lg bg-white/10 border border-white/20 text-white font-medium
                             hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyPastedSquad}
                  className="flex-1 py-3 rounded-lg bg-ai-primary text-black font-bold
                             hover:bg-ai-primary/90 transition-colors"
                >
                  Apply Squad
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
