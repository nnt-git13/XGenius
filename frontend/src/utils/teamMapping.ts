/**
 * Mapping between team names and FPL team codes for shirt images
 * FPL team codes from the bootstrap-static API
 */

export const TEAM_FPL_CODES: Record<string, number> = {
  "Arsenal": 1,
  "Aston Villa": 2,
  "Bournemouth": 3,
  "Brentford": 4,
  "Brighton": 5,
  "Burnley": 6,
  "Chelsea": 7,
  "Crystal Palace": 8,
  "Everton": 9,
  "Fulham": 10,
  "Liverpool": 11,
  "Luton": 12,
  "Man City": 13,
  "Man Utd": 14,
  "Newcastle": 15,
  "Nott'm Forest": 16,
  "Sheffield Utd": 17,
  "Spurs": 18,
  "West Ham": 19,
  "Wolves": 20,
}

/**
 * Get the shirt image path for a team
 * @param teamName - Full team name
 * @param teamFplCode - Optional FPL team code (takes precedence over teamName)
 * @param kitType - 'home', 'away', or 'third' (defaults to 'home')
 * @returns Path to the 3D shirt image, or null if not found
 */
export function getTeamShirtPath(
  teamName: string, 
  teamFplCode?: number | null,
  kitType: 'home' | 'away' | 'third' = 'home'
): string | null {
  // Use FPL code if provided, otherwise try to map from team name
  let teamCode = teamFplCode
  if (!teamCode) {
    teamCode = TEAM_FPL_CODES[teamName]
  }
  
  if (!teamCode) {
    return null
  }
  
  // Try to find the shirt image
  const path = `/football_shirts/graphics/kits/${teamCode}_${kitType}_3d.png`
  return path
}

/**
 * Get all available kit types for a team
 */
export function getAvailableKits(teamName: string): ('home' | 'away' | 'third')[] {
  const teamCode = TEAM_FPL_CODES[teamName]
  if (!teamCode) {
    return []
  }
  
  const available: ('home' | 'away' | 'third')[] = []
  // We'll check if files exist, but for now assume home is always available
  available.push('home')
  
  // Check for away and third (we'll let the image loading handle 404s)
  available.push('away', 'third')
  
  return available
}

