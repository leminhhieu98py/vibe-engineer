import { describe, expect, it } from "vitest";
import { addCard, createDummyBoard, deleteCard, moveCard, renameColumn } from "./board";

describe("board state operations", () => {
  it("renames a column", () => {
    const board = createDummyBoard(() => "id-1");
    const next = renameColumn(board, "col-todo", "Next up");
    expect(next.columns.find((c) => c.id === "col-todo")?.name).toBe("Next up");
    expect(board.columns.find((c) => c.id === "col-todo")?.name).toBe("To do");
  });

  it("adds then deletes a card", () => {
    const board = createDummyBoard(() => "seed");
    const added = addCard(board, "col-backlog", { title: "A", details: "B" }, () => "card-1");

    expect(added.cardsById["card-1"]).toEqual({ id: "card-1", title: "A", details: "B" });
    expect(added.columns.find((c) => c.id === "col-backlog")?.cardIds).toContain("card-1");

    const deleted = deleteCard(added, "card-1");
    expect(deleted.cardsById["card-1"]).toBeUndefined();
    expect(deleted.columns.find((c) => c.id === "col-backlog")?.cardIds).not.toContain("card-1");
  });

  it("moves a card across columns and preserves ordering", () => {
    let n = 0;
    const id = () => `c${++n}`;
    const board = createDummyBoard(id);

    const backlog = board.columns.find((c) => c.id === "col-backlog")!;
    const movedCardId = backlog.cardIds[0]!;

    const next = moveCard(board, movedCardId, "col-done", 0);
    expect(next.columns.find((c) => c.id === "col-backlog")?.cardIds).not.toContain(movedCardId);
    expect(next.columns.find((c) => c.id === "col-done")?.cardIds[0]).toBe(movedCardId);
  });
});

