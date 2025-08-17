import { CLUBS, canonicalClubName } from "./epl";

const CODE_BY_NAME = Object.fromEntries(
  (Object.keys(CLUBS) as Array<keyof typeof CLUBS>).map(k => [k, CLUBS[k].short])
);

export function oppTag(oppTeam?: string, homeAway?: "H"|"A") {
  const canon = canonicalClubName(oppTeam || "");
  const code = canon ? CODE_BY_NAME[canon] : "—";
  return { oppCode: code, homeAway: (homeAway ?? "H") as "H"|"A" };
}
