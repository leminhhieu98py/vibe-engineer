import { expect, test } from "@playwright/test";

test("loads with dummy data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kanban Board" })).toBeVisible();
  await expect(page.getByText("Backlog")).toBeVisible();
});

test("renames a column", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "To do" }).click();
  const input = page.getByLabel("Rename column");
  await input.fill("Next up");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: "Next up" })).toBeVisible();
});

test("adds and deletes a card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add card" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("New card");
  await dialog.getByLabel("Details").fill("Some details");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();

  await expect(page.getByText("New card")).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete card: New card", exact: true }).click();
  await expect(page.getByText("New card")).toHaveCount(0);
});

test("drags a card from Backlog to Done", async ({ page }) => {
  await page.goto("/");

  const card = page.locator('[data-card-title="Write Kanban MVP plan"]').first();
  const doneDrop = page.getByTestId("droppable-col-done");

  await expect(card).toBeVisible();
  await expect(doneDrop).toBeVisible();

  const cardBox = await card.boundingBox();
  const doneBox = await doneDrop.boundingBox();
  if (!cardBox || !doneBox) throw new Error("Missing bounding boxes for drag-and-drop");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(doneBox.x + doneBox.width / 2, doneBox.y + 40, { steps: 12 });
  await page.mouse.up();

  await expect(doneDrop.locator('[data-card-title="Write Kanban MVP plan"]')).toBeVisible();
});

