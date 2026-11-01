import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  DataGrid,
  EditableText,
  FloatingInspector,
  IssueCard,
  IssueEditor,
  KanbanBoard,
  StatusPill,
  defaultStatuses,
  formatRelativeTime,
  useHotkey,
  validateIssueDraft,
  type IssueDraft,
} from "../index";
import { axeViolations } from "./axe";

describe("IssueCard", () => {
  it("has a concise name, a rich description and opens on Enter", async () => {
    const onOpen = vi.fn();
    const { container } = render(
      <IssueCard
        issueKey="PLAT-87"
        title="SSO"
        type="story"
        priority="high"
        assignee={{ name: "Daniel Kim" }}
        labels={["Backend"]}
        onOpen={onOpen}
      />,
    );
    const card = screen.getByRole("button", { name: "PLAT-87: SSO" });
    expect(card).toHaveAccessibleDescription(
      "Story. High priority. Assigned to Daniel Kim. Labels: Backend",
    );
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("merges external key handlers instead of replacing them", async () => {
    const onKeyDown = vi.fn();
    const onOpen = vi.fn();
    render(<IssueCard issueKey="A-1" title="T" onOpen={onOpen} onKeyDown={onKeyDown} />);
    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    expect(onKeyDown).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalled();
  });
});

describe("StatusPill", () => {
  it("conveys status through text, not colour alone", () => {
    render(
      <StatusPill tone="success" shape="done">
        Done
      </StatusPill>,
    );
    expect(screen.getByText("Done")).toBeVisible();
  });
});

describe("KanbanBoard", () => {
  const columns = defaultStatuses.map((s) => ({
    id: s.value,
    title: s.label,
    wipLimit: s.value === "in-review" ? 1 : undefined,
  }));
  const items = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `i${i}`, title: `Issue ${i}` }));

  function Board({
    todo = 3,
    review = 2,
    pageSize,
  }: {
    todo?: number;
    review?: number;
    pageSize?: number;
  }) {
    return (
      <KanbanBoard
        columns={columns}
        itemsByColumn={{
          todo: items(todo),
          "in-review": items(review).map((x) => ({ ...x, id: `r${x.id}` })),
        }}
        getItemId={(i) => i.id}
        getItemLabel={(i) => i.title}
        renderItem={(i, s) => <IssueCard {...s.dragHandleProps} issueKey={i.id} title={i.title} />}
        onMoveItem={() => {}}
        renderColumnEmpty={() => "Nothing here"}
        pageSize={pageSize}
      />
    );
  }

  it("renders labelled columns with counts and empty states", () => {
    render(<Board />);
    const todo = screen.getByRole("region", { name: "To do" });
    expect(within(todo).getAllByRole("listitem")).toHaveLength(3);
    expect(
      within(screen.getByRole("region", { name: "Done" })).getByText("Nothing here"),
    ).toBeInTheDocument();
  });

  it("warns when a column exceeds its WIP limit", () => {
    render(<Board review={2} />);
    expect(
      within(screen.getByRole("region", { name: "In review" })).getByRole("note"),
    ).toHaveTextContent("Over WIP limit");
  });

  it("paginates long columns", async () => {
    render(<Board todo={130} pageSize={50} />);
    const todo = screen.getByRole("region", { name: "To do" });
    expect(within(todo).getAllByRole("listitem")).toHaveLength(50);
    await userEvent.click(within(todo).getByRole("button", { name: "Show 50 more" }));
    expect(within(todo).getAllByRole("listitem")).toHaveLength(100);
  });

  it("gives cards drag instructions for screen readers", () => {
    render(<Board todo={1} review={0} />);
    const card = screen.getByRole("button", { name: "i0: Issue 0" });
    expect(card).toHaveAttribute("aria-roledescription", "sortable");
    expect(card.getAttribute("aria-describedby")).toBeTruthy();
  });
});

describe("EditableText", () => {
  function Harness({ onCommit }: { onCommit: (v: string) => void }) {
    const [v, setV] = useState("Original");
    return <EditableText label="Title" value={v} onCommit={(x) => (setV(x), onCommit(x))} />;
  }

  it("commits on Enter and cancels on Escape", async () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    await userEvent.click(screen.getByRole("button", { name: /Title: Original/ }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Title" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Renamed{Enter}");
    expect(onCommit).toHaveBeenCalledWith("Renamed");
    await userEvent.click(screen.getByRole("button", { name: /Title: Renamed/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), " draft{Escape}");
    expect(screen.getByRole("button", { name: /Title: Renamed\./ })).toHaveFocus();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty required value with an accessible error", async () => {
    render(<Harness onCommit={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Title/ }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Title" }));
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Title is required");
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveAttribute("aria-invalid", "true");
  });
});

describe("IssueEditor", () => {
  it("validates, focuses the first error, then submits", async () => {
    const onSubmit = vi.fn();
    render(<IssueEditor people={[{ id: "p", name: "Priya Raman" }]} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Create issue" }));
    const summary = screen.getByRole("textbox", { name: /Summary/ });
    expect(summary).toHaveFocus();
    expect(summary).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.type(summary, "  New issue  ");
    await userEvent.click(screen.getByRole("button", { name: "Create issue" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New issue", type: "task", priority: "medium" }),
    );
  });

  it("validateIssueDraft rejects bad estimates", () => {
    const base: IssueDraft = {
      title: "x",
      description: "",
      type: "task",
      priority: "low",
      status: "todo",
      assigneeId: null,
      labels: [],
      dueDate: null,
      estimate: -1,
    };
    expect(validateIssueDraft(base).estimate).toBeDefined();
    expect(validateIssueDraft({ ...base, estimate: 5 })).toEqual({});
  });
});

describe("FloatingInspector", () => {
  it("docks non-modally, takes focus, and closes on Escape", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open PLAT-1</button>
          <FloatingInspector open={open} onOpenChange={setOpen} title="PLAT-1">
            details
          </FloatingInspector>
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open PLAT-1" });
    await userEvent.click(trigger);
    const panel = screen.getByRole("complementary", { name: "PLAT-1" });
    await waitFor(() => expect(panel).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("DataGrid", () => {
  it("sorts via header buttons and reflects aria-sort", async () => {
    const rows = [
      { id: "1", n: "Charlie", v: 2 },
      { id: "2", n: "alpha", v: 10 },
      { id: "3", n: "Bravo", v: 1 },
    ];
    render(
      <DataGrid
        label="People"
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { id: "n", header: "Name", cell: (r) => r.n, sortValue: (r) => r.n, isRowHeader: true },
          { id: "v", header: "Value", cell: (r) => r.v, sortValue: (r) => r.v },
        ]}
      />,
    );
    const nameHeader = screen.getByRole("columnheader", { name: /Name/ });
    await userEvent.click(within(nameHeader).getByRole("button"));
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getAllByRole("rowheader").map((c) => c.textContent)).toEqual([
      "alpha",
      "Bravo",
      "Charlie",
    ]);
    const valueHeader = screen.getByRole("columnheader", { name: /Value/ });
    await userEvent.click(within(valueHeader).getByRole("button"));
    await userEvent.click(within(valueHeader).getByRole("button"));
    expect(screen.getAllByRole("rowheader").map((c) => c.textContent)).toEqual([
      "alpha",
      "Charlie",
      "Bravo",
    ]);
  });
});

describe("utilities", () => {
  it("formatRelativeTime", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    expect(formatRelativeTime("2026-10-03T09:00:00Z", now, "en")).toBe("3 hours ago");
    expect(formatRelativeTime("2026-10-02T12:00:00Z", now, "en")).toBe("yesterday");
    expect(formatRelativeTime("2026-10-03T11:59:50Z", now, "en")).toBe("just now");
  });

  it("useHotkey ignores plain keys typed into inputs but honours mod-combos", async () => {
    const plain = vi.fn();
    const mod = vi.fn();
    function H() {
      useHotkey("c", plain);
      useHotkey("mod+k", mod, { allowInInputs: true });
      return <input aria-label="field" />;
    }
    render(<H />);
    await userEvent.type(screen.getByRole("textbox"), "c");
    expect(plain).not.toHaveBeenCalled();
    await userEvent.keyboard("{Control>}k{/Control}");
    expect(mod).toHaveBeenCalled();
    act(() => screen.getByRole("textbox").blur());
    await userEvent.keyboard("c");
    expect(plain).toHaveBeenCalled();
  });
});
