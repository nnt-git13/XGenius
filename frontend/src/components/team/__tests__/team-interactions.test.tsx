import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EnhancedPitch } from "../EnhancedPitch"
import { PlayerDetailsPanel } from "../PlayerDetailsPanel"
import type { Formation, PlayerDetail } from "@/types/team"

const FORMATION_442: Formation = { name: "4-4-2", def: 4, mid: 4, fwd: 2 }

function makePlayer(id: number, name: string, position: PlayerDetail["position"], team: string): PlayerDetail {
  return {
    id,
    name,
    position,
    team,
    price: 5.0,
    status: "a",
    total_points: 10,
    goals_scored: 1,
    assists: 2,
    clean_sheets: 0,
  }
}

function Harness() {
  const [selected, setSelected] = React.useState<PlayerDetail | null>(null)

  const players: PlayerDetail[] = [
    makePlayer(1, "GK One", "GK", "Arsenal"),
    makePlayer(2, "DEF One", "DEF", "Chelsea"),
    makePlayer(3, "DEF Two", "DEF", "Chelsea"),
    makePlayer(4, "DEF Three", "DEF", "Chelsea"),
    makePlayer(5, "DEF Four", "DEF", "Chelsea"),
    makePlayer(6, "MID One", "MID", "Arsenal"),
    makePlayer(7, "MID Two", "MID", "Arsenal"),
    makePlayer(8, "MID Three", "MID", "Arsenal"),
    makePlayer(9, "MID Four", "MID", "Arsenal"),
    makePlayer(10, "FWD One", "FWD", "Arsenal"),
    makePlayer(11, "FWD Two", "FWD", "Arsenal"),
  ]

  return (
    <div>
      <EnhancedPitch
        players={players}
        formation={FORMATION_442}
        selectedPlayerId={selected?.id ?? null}
        onPlayerClick={(p) => setSelected(p)}
      />
      <PlayerDetailsPanel player={selected} />
    </div>
  )
}

describe("My Team interactions", () => {
  it("renders 11 player chips and clicking selects a player and updates details panel", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const chips = Array.from({ length: 11 }, (_, i) => screen.getByTestId(`player-chip-${i + 1}`))
    expect(chips).toHaveLength(11)

    await user.click(screen.getByTestId("player-chip-10"))
    expect(await screen.findByRole("button", { name: /view full stats/i })).toBeInTheDocument()
  })
})


