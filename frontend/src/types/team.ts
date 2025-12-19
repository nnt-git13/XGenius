/**
 * Type definitions for team/squad data structures
 */

export interface PlayerDetail {
  id: number
  name: string
  position: "GK" | "DEF" | "MID" | "FWD"
  team: string
  team_short_name?: string
  price: number // Price in millions (e.g., 10.5 = £10.5M)
  fpl_code?: number | null
  team_fpl_code?: number | null // FPL team code for shirt images
  status: "a" | "i" | "s" | "u" | "d" // a=available, i=injured, s=suspended, u=unavailable, d=doubtful
  is_starting?: boolean
  is_captain?: boolean
  is_vice_captain?: boolean
  multiplier?: number
  gw_points_raw?: number
  gw_points?: number
  total_points: number
  goals_scored: number
  assists: number
  clean_sheets: number
  yellow_cards?: number // Yellow cards
  red_cards?: number // Red cards
  // Fixture information
  next_fixture_opponent?: string // Opponent team name
  next_fixture_opponent_short?: string // Opponent team short code (e.g., "LIV", "MCI")
  next_fixture_home_away?: "H" | "A" // Home or Away
  next_fixture_difficulty?: number // 1-5 difficulty rating
}

export interface TeamEvaluationResponse {
  season: string
  gameweek: number | null
  overall_points?: number | null
  gw_rank?: number | null
  transfers?: number | null
  active_chip?: string | null
  total_points: number
  expected_points: number
  xg_score?: number
  risk_score: number
  fixture_difficulty: number
  squad_value: number // Total squad value in millions
  bank: number // Remaining bank in millions
  players: PlayerDetail[]
  captain_id: number | null
  vice_captain_id: number | null
}

export interface Formation {
  name: string
  def: number
  mid: number
  fwd: number
}

export const FORMATIONS: Formation[] = [
  { name: "4-4-2", def: 4, mid: 4, fwd: 2 },
  { name: "4-3-3", def: 4, mid: 3, fwd: 3 },
  { name: "3-5-2", def: 3, mid: 5, fwd: 2 },
  { name: "3-4-3", def: 3, mid: 4, fwd: 3 },
  { name: "4-5-1", def: 4, mid: 5, fwd: 1 },
  { name: "5-4-1", def: 5, mid: 4, fwd: 1 },
  { name: "5-3-2", def: 5, mid: 3, fwd: 2 },
]

