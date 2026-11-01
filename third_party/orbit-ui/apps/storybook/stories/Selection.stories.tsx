import { Calendar, Combobox, DatePicker, Field, IssueTypeIcon, Select } from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { labels, people } from "./fixtures";

const meta: Meta = {
  title: "Components/Selection",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "`Select` for short fixed lists (Radix, typeahead), `Combobox` for searchable single/multi selection (ARIA combobox + listbox with `aria-activedescendant`), `DatePicker` with a keyboard-navigable calendar grid.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

export const SelectStory: Story = {
  name: "Select",
  render: () => (
    <div style={{ maxWidth: 280 }}>
      <Field label="Issue type">
        <Select
          defaultValue="story"
          options={(["story", "task", "bug", "epic"] as const).map((t) => ({
            value: t,
            label: t[0]!.toUpperCase() + t.slice(1),
            icon: <IssueTypeIcon type={t} />,
          }))}
        />
      </Field>
    </div>
  ),
};

function ComboboxDemo() {
  const [assignee, setAssignee] = useState<string | null>("priya");
  const [tags, setTags] = useState<string[]>(["frontend"]);
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 320 }}>
      <Field label="Assignee">
        <Combobox
          value={assignee}
          onValueChange={setAssignee}
          options={people.map((p) => ({ value: p.id, label: p.name, description: p.detail }))}
          searchPlaceholder="Search people…"
        />
      </Field>
      <Field label="Labels">
        <Combobox
          multiple
          value={tags}
          onValueChange={setTags}
          options={labels.map((l) => ({ value: l.value, label: l.label }))}
          placeholder="Add labels"
        />
      </Field>
    </div>
  );
}

export const ComboboxStory: Story = {
  name: "Combobox",
  render: () => <ComboboxDemo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Assignee/ }));
    const input = await c.findByRole("combobox", { name: /Search people/ });
    await userEvent.type(input, "lena");
    await userEvent.keyboard("{Enter}");
    await expect(c.getByRole("button", { name: /Assignee/ })).toHaveTextContent("Lena Fischer");
  },
};

export const DatePickerStory: Story = {
  name: "DatePicker",
  render: () => (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ width: 240 }}>
        <Field
          label="Due date"
          description="Arrow keys move by day/week, PageUp/PageDown by month."
        >
          <DatePicker defaultValue="2026-10-14" clearable />
        </Field>
      </div>
      <div className="orb-card orb-card--solid orb-pad-sm">
        <Calendar defaultValue="2026-10-14" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const day = c.getAllByRole("button", { name: /October 14, 2026/ }).at(-1)!;
    day.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(document.activeElement).toHaveAccessibleName(/October 15, 2026/);
  },
};
