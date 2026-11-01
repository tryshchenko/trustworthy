import { KanbanSquare, Moon, Plus, Settings } from "@orbit/icons";
import {
  Button,
  CommandPalette,
  FilterBar,
  HeaderSearch,
  useHotkey,
  type FilterDefinition,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { labels, people } from "./fixtures";

const meta: Meta = { title: "Product/Filtering & commands", tags: ["autodocs"] };
export default meta;

function FilterDemo() {
  const [query, setQuery] = useState("");
  const [values, setValues] = useState<Record<string, string[]>>({
    assignee: [],
    label: ["backend"],
  });
  const filters: FilterDefinition[] = [
    {
      id: "assignee",
      label: "Assignee",
      value: values.assignee!,
      options: people.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      id: "label",
      label: "Label",
      value: values.label!,
      options: labels.map((l) => ({ value: l.value, label: l.label })),
    },
  ];
  return (
    <FilterBar
      query={query}
      onQueryChange={setQuery}
      filters={filters}
      onFilterChange={(id, v) => setValues((x) => ({ ...x, [id]: v }))}
      onClearAll={() => {
        setQuery("");
        setValues({ assignee: [], label: [] });
      }}
      resultCount={12}
      actions={
        <Button size="sm" variant="secondary" leadingIcon={<Plus size={14} />}>
          Add issue
        </Button>
      }
    />
  );
}

export const Filters: StoryObj = {
  name: "FilterBar",
  render: () => <FilterDemo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("textbox", { name: "Search issues" }), "sso");
    await userEvent.click(c.getByRole("button", { name: "Clear filters" }));
    await expect(c.getByRole("textbox", { name: "Search issues" })).toHaveValue("");
    await expect(c.getByRole("button", { name: "Label" })).toBeInTheDocument();
  },
};

function PaletteDemo({ onRun }: { onRun: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  useHotkey("mod+k", () => setOpen((o) => !o), { allowInInputs: true });
  return (
    <div style={{ maxWidth: 520 }}>
      <HeaderSearch onClick={() => setOpen(true)} />
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={[
          {
            id: "create",
            label: "Create issue",
            group: "Actions",
            icon: <Plus size={16} />,
            shortcut: "C",
            onSelect: () => onRun("create"),
          },
          {
            id: "board",
            label: "Go to board",
            group: "Navigation",
            icon: <KanbanSquare size={16} />,
            onSelect: () => onRun("board"),
          },
          {
            id: "settings",
            label: "Open settings",
            group: "Navigation",
            icon: <Settings size={16} />,
            onSelect: () => onRun("settings"),
          },
          {
            id: "dark",
            label: "Switch to dark theme",
            group: "Appearance",
            icon: <Moon size={16} />,
            keywords: ["night"],
            onSelect: () => onRun("dark"),
          },
        ]}
      />
    </div>
  );
}

export const Palette: StoryObj<{ onRun: (id: string) => void }> = {
  name: "CommandPalette",
  args: { onRun: fn() },
  render: (args) => <PaletteDemo onRun={args.onRun} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Search issues/ }));
    const input = await c.findByRole("combobox", { name: "Search commands" });
    await userEvent.type(input, "night");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(args.onRun).toHaveBeenCalledWith("dark"));
  },
};
