// Full Premier League (2024–25) club data + helpers

export type ClubKey =
  | "Arsenal" | "Aston Villa" | "Bournemouth" | "Brentford" | "Brighton"
  | "Chelsea" | "Crystal Palace" | "Everton" | "Fulham" | "Ipswich Town"
  | "Leicester City" | "Liverpool" | "Manchester City" | "Manchester United"
  | "Newcastle United" | "Nottingham Forest" | "Southampton"
  | "Tottenham Hotspur" | "West Ham United" | "Wolverhampton Wanderers";

export const CLUBS: Record<ClubKey, {
  short: string;        // 3-letter FPL-style
  primary: string;      // jersey base
  trim?: string;        // collar/stripes
}> = {
  "Arsenal":                     { short: "ARS", primary: "#EF0107", trim: "#FFFFFF" },
  "Aston Villa":                 { short: "AVL", primary: "#670E36", trim: "#95BFE5" },
  "Bournemouth":                 { short: "BOU", primary: "#DA291C", trim: "#000000" },
  "Brentford":                   { short: "BRE", primary: "#E30613", trim: "#FFFFFF" },
  "Brighton":                    { short: "BHA", primary: "#0057B8", trim: "#FFFFFF" },
  "Chelsea":                     { short: "CHE", primary: "#034694", trim: "#FFFFFF" },
  "Crystal Palace":              { short: "CRY", primary: "#1B458F", trim: "#C4122E" },
  "Everton":                     { short: "EVE", primary: "#003399", trim: "#FFFFFF" },
  "Fulham":                      { short: "FUL", primary: "#FFFFFF", trim: "#000000" },
  "Ipswich Town":                { short: "IPS", primary: "#0054B4", trim: "#FFFFFF" },
  "Leicester City":              { short: "LEI", primary: "#003090", trim: "#FFFFFF" },
  "Liverpool":                   { short: "LIV", primary: "#C8102E", trim: "#00A398" },
  "Manchester City":             { short: "MCI", primary: "#6CABDD", trim: "#1C2C5B" },
  "Manchester United":           { short: "MUN", primary: "#DA020E", trim: "#000000" },
  "Newcastle United":            { short: "NEW", primary: "#000000", trim: "#FFFFFF" },
  "Nottingham Forest":           { short: "NFO", primary: "#DD0000", trim: "#FFFFFF" },
  "Southampton":                 { short: "SOU", primary: "#D71920", trim: "#FFFFFF" },
  "Tottenham Hotspur":           { short: "TOT", primary: "#132257", trim: "#FFFFFF" },
  "West Ham United":             { short: "WHU", primary: "#7A263A", trim: "#1BB1E7" },
  "Wolverhampton Wanderers":     { short: "WOL", primary: "#FDB913", trim: "#000000" },
};

// Common name variants → canonical keys above
const NORMALIZE: Record<string, ClubKey> = {
  "MAN CITY": "Manchester City",
  "MANCHESTER CITY": "Manchester City",
  "MAN UNITED": "Manchester United",
  "MANCHESTER UNITED": "Manchester United",
  "SPURS": "Tottenham Hotspur",
  "TOTTENHAM": "Tottenham Hotspur",
  "NEWCASTLE": "Newcastle United",
  "LEICESTER": "Leicester City",
  "WEST HAM": "West Ham United",
  "WOLVES": "Wolverhampton Wanderers",
  "NOTTM FOREST": "Nottingham Forest",
  "N FOREST": "Nottingham Forest",
  "NOTTINGHAM FOREST": "Nottingham Forest",
  "CRYSTAL PALACE": "Crystal Palace",
  "BRIGHTON & HOVE ALBION": "Brighton",
  "BRIGHTON AND HOVE ALBION": "Brighton",
  "IPSWICH": "Ipswich Town",
};

export function canonicalClubName(name?: string): ClubKey | undefined {
  if (!name) return undefined;
  // exact match first
  if ((CLUBS as any)[name]) return name as ClubKey;
  const up = name.trim().toUpperCase();
  if (NORMALIZE[up]) return NORMALIZE[up];
  // try loose match on leading token
  const hit = (Object.keys(CLUBS) as ClubKey[]).find(k => up.includes(k.toUpperCase()));
  return hit;
}

export function kitFor(team?: string) {
  const key = canonicalClubName(team);
  if (key) return CLUBS[key];
  return { short: "—", primary: "#1f2937", trim: "#e5e7eb" }; // fallback
}
