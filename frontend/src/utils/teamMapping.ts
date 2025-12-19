/**
 * Team name to abbreviation mapping
 */
export function getTeamAbbreviation(teamName: string): string {
  const abbreviations: Record<string, string> = {
    "Arsenal": "ARS",
    "Aston Villa": "AVL",
    "Bournemouth": "BOU",
    "Brentford": "BRE",
    "Brighton": "BHA",
    "Brighton & Hove Albion": "BHA",
    "Brighton and Hove Albion": "BHA",
    "Burnley": "BUR",
    "Chelsea": "CHE",
    "Crystal Palace": "CRY",
    "Everton": "EVE",
    "Fulham": "FUL",
    "Liverpool": "LIV",
    "Luton": "LUT",
    "Luton Town": "LUT",
    "Man City": "MCI",
    "Manchester City": "MCI",
    "Man Utd": "MUN",
    "Manchester United": "MUN",
    "Man United": "MUN",
    "Newcastle": "NEW",
    "Newcastle United": "NEW",
    "Newcastle Utd": "NEW",
    "Nott'm Forest": "NFO",
    "Nottingham Forest": "NFO",
    "Nottm Forest": "NFO",
    "Nottingham": "NFO",
    "Sheffield Utd": "SHU",
    "Sheffield United": "SHU",
    "Spurs": "TOT",
    "Tottenham": "TOT",
    "Tottenham Hotspur": "TOT",
    "West Ham": "WHU",
    "West Ham United": "WHU",
    "West Ham Utd": "WHU",
    "Wolves": "WOL",
    "Wolverhampton": "WOL",
    "Wolverhampton Wanderers": "WOL",
  }
  
  const normalized = teamName.trim()
  return abbreviations[normalized] || 
         abbreviations[Object.keys(abbreviations).find(k => k.toLowerCase() === normalized.toLowerCase()) || ""] ||
         teamName.slice(0, 3).toUpperCase()
}

/**
 * Mapping between team names and FPL team codes for shirt images
 * FPL team codes from the bootstrap-static API
 * 
 * This mapping handles various team name formats that might come from the backend
 */

export const TEAM_FPL_CODES: Record<string, number> = {
  // Exact matches
  "Arsenal": 1,
  "Aston Villa": 2,
  "Bournemouth": 3,
  "Brentford": 4,
  "Brighton": 5,
  "Brighton & Hove Albion": 5,
  "Brighton and Hove Albion": 5,
  "Burnley": 6,
  "Chelsea": 7,
  "Crystal Palace": 8,
  "Everton": 9,
  "Fulham": 10,
  "Liverpool": 11,
  "Luton": 12,
  "Luton Town": 12,
  // Manchester City variations
  "Man City": 13,
  "Manchester City": 13,
  "Man. City": 13,
  // Manchester United variations
  "Man Utd": 14,
  "Manchester United": 14,
  "Man. Utd": 14,
  "Man United": 14,
  // Newcastle variations
  "Newcastle": 15,
  "Newcastle United": 15,
  "Newcastle Utd": 15,
  // Nottingham Forest variations
  "Nott'm Forest": 16,
  "Nottingham Forest": 16,
  "Nottm Forest": 16,
  "Nottingham": 16,
  // Sheffield United variations
  "Sheffield Utd": 17,
  "Sheffield United": 17,
  // Tottenham variations
  "Spurs": 18,
  "Tottenham": 18,
  "Tottenham Hotspur": 18,
  "Tottenham H": 18,
  // West Ham variations
  "West Ham": 19,
  "West Ham United": 19,
  "West Ham Utd": 19,
  // Wolves variations
  "Wolves": 20,
  "Wolverhampton": 20,
  "Wolverhampton Wanderers": 20,
}

/**
 * Normalize team name to a canonical format for matching
 */
function normalizeTeamName(name: string): string {
  return name.trim()
}

/**
 * Get the FPL code for a team name, handling various name formats
 */
export function getTeamFplCode(teamName: string): number | null {
  const normalized = normalizeTeamName(teamName)
  
  // Try exact match first
  if (TEAM_FPL_CODES[normalized]) {
    return TEAM_FPL_CODES[normalized]
  }
  
  // Try case-insensitive match
  const lower = normalized.toLowerCase()
  for (const [key, value] of Object.entries(TEAM_FPL_CODES)) {
    if (key.toLowerCase() === lower) {
      return value
    }
  }
  
  // Try partial match (contains)
  for (const [key, value] of Object.entries(TEAM_FPL_CODES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value
    }
  }
  
  return null
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
  // Use FPL code if provided (highest priority)
  let teamCode = teamFplCode
  
  // If no code provided, try to map from team name
  if (!teamCode && teamName) {
    teamCode = getTeamFplCode(teamName)
  }
  
  if (!teamCode) {
    return null
  }
  
  // Return the path to the shirt image
  // The image will be loaded and if it 404s, the component will handle the fallback
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

