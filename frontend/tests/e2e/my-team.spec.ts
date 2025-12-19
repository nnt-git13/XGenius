import { test, expect } from "@playwright/test";

test("My Team loads and selecting a player shows details", async ({ page }) => {
  await page.goto("/team");

  // Pitch should be visible
  await expect(page.getByText("Formation")).toBeVisible();

  // Empty-state details panel
  await expect(page.getByText("Click a player on the pitch")).toBeVisible();

  // Click the first available player chip (data-testid is deterministic when players exist)
  const chip = page.locator('[data-testid^="player-chip-"]').first();
  await expect(chip).toBeVisible();
  await chip.click();

  // Details panel should now show actions (only present when a player is selected)
  await expect(page.getByRole("button", { name: "View full stats" })).toBeVisible();
});


