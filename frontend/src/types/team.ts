/**
 * Type definitions for team/squad data structures
 */

export interface PlayerDetail {
  id: number
  name: string
  position: "GK" | "DEF" | "MID" | "FWD"
  team: string
  price: number // Price in millions (e.g., 10.5 = £10.5M)
  fpl_code?: number | null
  team_fpl_code?: number | null // FPL team code for shirt images
  status: "a" | "i" | "s" | "u" | "d" // a=available, i=injured, s=suspended, u=unavailable, d=doubtful
  total_points: number
  goals_scored: number
  assists: number
  clean_sheets: number
}

export interface TeamEvaluationResponse {
  season: string
  gameweek: number | null
  total_points: number
  expected_points: number
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

