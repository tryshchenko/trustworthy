import { Plus } from "@orbit/icons";
import {
  Button,
  EmptyState,
  IssueCard,
  KanbanBoard,
  KanbanColumn,
  defaultStatuses,
  type KanbanMove,
  type KanbanRenderState,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useMemo, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { issues as seed, type StoryIssue } from "./fixtures";

const meta: Meta = {
  title: "Product/KanbanBoard",
  tags: ["autodocs"],
  parameters: {
    orbitLayout: "fullscreen",
    docs: {
      description: {
        component:
          "Generic, multi-column drag-and-drop (dnd-kit). You own the data: the board renders `itemsByColumn` and reports `onMoveItem({ itemId, fromColumnId, toColumnId, toIndex })`. Pointer, touch and keyboard (Space, arrows, Space/Esc) are supported with live announcements.",
      },
    },
  },
};
export default meta;

const columns = defaultStatuses.map((s) => ({
  id: s.value,
  title: s.label,
  tone: s.tone,
  shape: s.shape,
  wipLimit: s.value === "in-review" ? 2 : undefined,
}));

function useBoard(initial: StoryIssue[]) {
  const [items, setItems] = useState(initial);
  const itemsByColumn = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.id, items.filter((i) => i.status === c.id)])),
    [items],
  );
  const onMoveItem = useCallback(({ itemId, toColumnId, toIndex }: KanbanMove) => {
    setItems((prev) => {
      const moving = { ...prev.find((i) => i.id === itemId)!, status: toColumnId };
      const rest = prev.filter((i) => i.id !== itemId);
      const dest = rest.filter((i) => i.status === toColumnId);
      const anchor = dest[toIndex];
      const at = anchor ? rest.indexOf(anchor) : rest.length;
      rest.splice(at, 0, moving);
      return rest;
    });
  }, []);
  return { itemsByColumn, onMoveItem };
}

function Board({ initial = seed }: { initial?: StoryIssue[] }) {
  const { itemsByColumn, onMoveItem } = useBoard(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const renderItem = useCallback(
    (i: StoryIssue, s: KanbanRenderState) => (
      <IssueCard
        {...s.dragHandleProps}
        issueKey={i.key}
        title={i.title}
        type={i.type}
        priority={i.priority}
        assignee={i.assignee}
        labels={i.labels}
        estimate={i.estimate}
        selected={selected === i.id}
        dragging={s.isOverlay}
        onOpen={() => setSelected(i.id)}
      />
    ),
    [selected],
  );
  return (
    <div style={{ height: "100%", padding: 16, boxSizing: "border-box" }}>
      <KanbanBoard
        aria-label="Sprint board"
        columns={columns}
        itemsByColumn={itemsByColumn}
        getItemId={(i) => i.id}
        getItemLabel={(i) => `${i.key} ${i.title}`}
        renderItem={renderItem}
        onMoveItem={onMoveItem}
        renderColumnEmpty={() => (
          <EmptyState size="sm" title="No issues" description="Drag a card here." />
        )}
        renderColumnFooter={() => (
          <Button variant="ghost" size="sm" fullWidth leadingIcon={<Plus size={14} />}>
            Create issue
          </Button>
        )}
      />
    </div>
  );
}

export const Interactive: StoryObj = {
  render: () => <Board />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const todo = c.getByRole("region", { name: "To do" });
    const card = within(todo).getByRole("button", { name: /PLAT-90/ });
    // Keyboard drag: Space to lift, ArrowRight to move to the next column, Space to drop.
    card.focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard(" ");
    await waitFor(() =>
      expect(
        within(c.getByRole("region", { name: "In progress" })).getByRole("button", {
          name: /PLAT-90/,
        }),
      ).toBeInTheDocument(),
    );
  },
};

export const EmptyColumns: StoryObj = {
  render: () => <Board initial={seed.filter((i) => i.status === "in-progress")} />,
};

export const WipLimitExceeded: StoryObj = {
  render: () => (
    <Board
      initial={[
        ...seed,
        { ...seed[2]!, id: "x", key: "PLAT-120", title: "Review onboarding copy" },
      ]}
    />
  ),
};

export const SingleColumn: StoryObj = {
  parameters: { orbitLayout: "padded" },
  render: () => (
    <div style={{ width: 300, height: 420, display: "flex" }}>
      <KanbanColumn title="In review" count={2} tone="discovery" shape="review" wipLimit={3}>
        {/* Standalone columns expect list items as children (KanbanBoard adds them for you). */}
        {seed.slice(2, 4).map((i) => (
          <div role="listitem" key={i.id}>
            <IssueCard
              issueKey={i.key}
              title={i.title}
              type={i.type}
              priority={i.priority}
              assignee={i.assignee}
            />
          </div>
        ))}
      </KanbanColumn>
    </div>
  ),
};
