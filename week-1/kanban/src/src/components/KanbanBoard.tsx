"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardState, ColumnId } from "@/lib/board";
import { addCard, createDummyBoard, deleteCard, moveCard, renameColumn } from "@/lib/board";
import { InlineEditableText } from "@/components/InlineEditableText";

function DroppableColumn(props: { id: string; testId?: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: props.id });
  return (
    <div
      ref={setNodeRef}
      data-testid={props.testId}
      className="flex flex-1 flex-col gap-2 p-3"
    >
      {props.children}
    </div>
  );
}

function SortableCard(props: {
  id: string;
  title: string;
  details: string;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-card-title={props.title}
      className={[
        "group rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 shadow-sm transition",
        "hover:-translate-y-[1px] hover:shadow-md",
        isDragging ? "opacity-70 shadow-lg" : "",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-semibold leading-5 text-[color:var(--dark-navy)]">
          {props.title}
        </h3>
        <button
          type="button"
          className="opacity-0 transition group-hover:opacity-100 focus:opacity-100"
          aria-label={`Delete card: ${props.title}`}
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete();
          }}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[12px] text-[color:var(--gray-text)] hover:bg-black/5 hover:text-[color:var(--dark-navy)] focus:outline-none focus:ring-2 focus:ring-[color:var(--blue-primary)]">
            ✕
          </span>
        </button>
      </div>
      {props.details ? (
        <p className="mt-1 line-clamp-3 text-[12px] leading-5 text-[color:var(--gray-text)]">
          {props.details}
        </p>
      ) : null}
    </article>
  );
}

export function KanbanBoard() {
  const initial = useMemo(() => createDummyBoard(), []);
  const [board, setBoard] = useState<BoardState>(initial);
  const [addTargetColumnId, setAddTargetColumnId] = useState<ColumnId | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDetails, setDraftDetails] = useState("");
  const addDialogRef = useRef<HTMLDialogElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function openAddCard(columnId: ColumnId) {
    setAddTargetColumnId(columnId);
    setDraftTitle("");
    setDraftDetails("");
    addDialogRef.current?.showModal();
  }

  function closeAddCard() {
    addDialogRef.current?.close();
    setAddTargetColumnId(null);
  }

  return (
    <div className="min-h-screen bg-[color:var(--surface2)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--border)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-1 rounded-full bg-[color:var(--accent-yellow)]" />
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-[color:var(--dark-navy)]">
                Kanban Board
              </h1>
              <p className="text-[12px] text-[color:var(--gray-text)]">
                One board. Five columns. Drag cards across.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-2 w-2 rounded-full bg-[color:var(--blue-primary)]" />
            <span className="text-[12px] font-medium text-[color:var(--gray-text)]">
              In-memory only
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over) return;
            const activeId = String(active.id);
            const overId = String(over.id);
            if (activeId === overId) return;

            const getColumnForId = (id: string): { columnId: ColumnId; index: number } | null => {
              for (const col of board.columns) {
                const idx = col.cardIds.indexOf(id);
                if (idx >= 0) return { columnId: col.id as ColumnId, index: idx };
              }
              return null;
            };

            const from = getColumnForId(activeId);
            if (!from) return;

            const to =
              getColumnForId(overId) ??
              (board.columns.some((c) => c.id === overId)
                ? { columnId: overId as ColumnId, index: board.columns.find((c) => c.id === overId)!.cardIds.length }
                : null);
            if (!to) return;

            setBoard((b) => moveCard(b, activeId, to.columnId, to.index));
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {board.columns.map((col) => (
              <section
                key={col.id}
                data-testid={`column-${col.id}`}
                className="flex min-h-[70vh] flex-col rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow)]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] px-3 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <InlineEditableText
                      ariaLabel="Rename column"
                      value={col.name}
                      placeholder="Column name"
                      onChange={(name) =>
                        setBoard((b) => renameColumn(b, col.id as ColumnId, name))
                      }
                    />
                  </div>
                  <span className="rounded-full bg-black/5 px-2 py-1 text-[11px] font-medium text-[color:var(--gray-text)]">
                    {col.cardIds.length}
                  </span>
                </div>

                <SortableContext items={col.cardIds}>
                  <DroppableColumn id={col.id} testId={`droppable-${col.id}`}>
                    {col.cardIds.map((cardId) => {
                      const card = board.cardsById[cardId];
                      return (
                        <SortableCard
                          key={cardId}
                          id={cardId}
                          title={card.title}
                          details={card.details}
                          onDelete={() => {
                            if (!confirm("Delete this card?")) return;
                            setBoard((b) => deleteCard(b, cardId));
                          }}
                        />
                      );
                    })}

                    <button
                      type="button"
                      className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-[12px] font-medium text-[color:var(--dark-navy)] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--blue-primary)]"
                      onClick={() => openAddCard(col.id as ColumnId)}
                    >
                      <span className="text-[color:var(--purple-secondary)]">＋</span>
                      Add card
                    </button>

                    {col.cardIds.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-8 text-center text-[12px] text-[color:var(--gray-text)]">
                        Drop a card here.
                      </div>
                    ) : null}
                  </DroppableColumn>
                </SortableContext>
              </section>
            ))}
          </div>
        </DndContext>
      </main>

      <dialog
        ref={addDialogRef}
        className="w-[min(520px,calc(100vw-24px))] rounded-2xl border border-[color:var(--border)] bg-white p-0 shadow-[var(--shadow)] backdrop:bg-black/30"
        onClose={() => {
          setAddTargetColumnId(null);
        }}
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            if (!addTargetColumnId) return;
            if (!draftTitle.trim()) return;

            setBoard((b) =>
              addCard(
                b,
                addTargetColumnId,
                { title: draftTitle.trim(), details: draftDetails.trim() },
                () => crypto.randomUUID(),
              ),
            );
            closeAddCard();
          }}
        >
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <h2 className="text-[14px] font-semibold text-[color:var(--dark-navy)]">
              Add card
            </h2>
            <p className="mt-1 text-[12px] text-[color:var(--gray-text)]">
              Title is required. Details are optional.
            </p>
          </div>

          <div className="space-y-4 px-5 py-4">
            <label className="block">
              <span className="text-[12px] font-medium text-[color:var(--gray-text)]">
                Title
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-[13px] text-[color:var(--dark-navy)] shadow-sm outline-none focus:ring-2 focus:ring-[color:var(--blue-primary)]"
                value={draftTitle}
                autoFocus
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="e.g. Draft PR description"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-medium text-[color:var(--gray-text)]">
                Details
              </span>
              <textarea
                className="mt-1 min-h-[110px] w-full resize-none rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-[13px] leading-5 text-[color:var(--dark-navy)] shadow-sm outline-none focus:ring-2 focus:ring-[color:var(--blue-primary)]"
                value={draftDetails}
                onChange={(e) => setDraftDetails(e.target.value)}
                placeholder="Optional notes..."
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border)] px-5 py-4">
            <button
              type="button"
              className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2 text-[12px] font-semibold text-[color:var(--dark-navy)] hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-[color:var(--blue-primary)]"
              onClick={() => closeAddCard()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[color:var(--purple-secondary)] px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--blue-primary)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!draftTitle.trim()}
            >
              Add
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

