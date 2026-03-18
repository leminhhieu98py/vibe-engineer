export type ColumnId = string;
export type CardId = string;

export type Column = {
  id: ColumnId;
  name: string;
  cardIds: CardId[];
};

export type Card = {
  id: CardId;
  title: string;
  details: string;
};

export type BoardState = {
  columns: Column[];
  cardsById: Record<CardId, Card>;
};

type IdFn = () => string;

function assertColumnExists(board: BoardState, columnId: ColumnId): Column {
  const col = board.columns.find((c) => c.id === columnId);
  if (!col) throw new Error(`Column not found: ${columnId}`);
  return col;
}

function cloneBoard(board: BoardState): BoardState {
  return {
    columns: board.columns.map((c) => ({ ...c, cardIds: [...c.cardIds] })),
    cardsById: { ...board.cardsById },
  };
}

export function createDummyBoard(id: IdFn = () => crypto.randomUUID()): BoardState {
  const columns: Column[] = [
    { id: "col-backlog", name: "Backlog", cardIds: [] },
    { id: "col-todo", name: "To do", cardIds: [] },
    { id: "col-inprogress", name: "In progress", cardIds: [] },
    { id: "col-review", name: "Review", cardIds: [] },
    { id: "col-done", name: "Done", cardIds: [] },
  ];

  const cards: Array<{ columnId: ColumnId; title: string; details: string }> = [
    {
      columnId: "col-backlog",
      title: "Write Kanban MVP plan",
      details: "Keep scope tight: 1 board, 5 columns, cards, DnD, add/delete.",
    },
    {
      columnId: "col-todo",
      title: "Design board UI",
      details: "Slick, professional layout with color tokens and good spacing.",
    },
    {
      columnId: "col-inprogress",
      title: "Implement state ops",
      details: "Pure functions for rename/add/delete/move with stable ordering.",
    },
    {
      columnId: "col-review",
      title: "Add Playwright tests",
      details: "Cover load, rename, add, delete, drag between columns.",
    },
    {
      columnId: "col-done",
      title: "Scaffold Next.js app",
      details: "Done.",
    },
  ];

  const cardsById: Record<CardId, Card> = {};
  for (const item of cards) {
    const cardId = id();
    cardsById[cardId] = { id: cardId, title: item.title, details: item.details };
    const col = columns.find((c) => c.id === item.columnId);
    if (col) col.cardIds.push(cardId);
  }

  return { columns, cardsById };
}

export function renameColumn(board: BoardState, columnId: ColumnId, name: string): BoardState {
  const next = cloneBoard(board);
  const col = assertColumnExists(next, columnId);
  col.name = name;
  return next;
}

export function addCard(
  board: BoardState,
  columnId: ColumnId,
  cardInput: { title: string; details: string },
  id: IdFn = () => crypto.randomUUID(),
): BoardState {
  const next = cloneBoard(board);
  const col = assertColumnExists(next, columnId);

  const cardId = id();
  next.cardsById[cardId] = { id: cardId, title: cardInput.title, details: cardInput.details };
  col.cardIds.push(cardId);
  return next;
}

export function deleteCard(board: BoardState, cardId: CardId): BoardState {
  if (!board.cardsById[cardId]) return board;

  const next = cloneBoard(board);
  delete next.cardsById[cardId];
  for (const col of next.columns) {
    const idx = col.cardIds.indexOf(cardId);
    if (idx >= 0) col.cardIds.splice(idx, 1);
  }
  return next;
}

export function moveCard(
  board: BoardState,
  cardId: CardId,
  toColumnId: ColumnId,
  toIndex: number,
): BoardState {
  if (!board.cardsById[cardId]) return board;

  const next = cloneBoard(board);
  const target = assertColumnExists(next, toColumnId);

  let from: Column | undefined;
  let fromIndex = -1;
  for (const col of next.columns) {
    const idx = col.cardIds.indexOf(cardId);
    if (idx >= 0) {
      from = col;
      fromIndex = idx;
      break;
    }
  }
  if (!from) return board;

  from.cardIds.splice(fromIndex, 1);
  const clampedIndex = Math.max(0, Math.min(toIndex, target.cardIds.length));
  target.cardIds.splice(clampedIndex, 0, cardId);
  return next;
}

