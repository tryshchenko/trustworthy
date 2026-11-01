import { AtSign, Search } from "@orbit/icons";
import { Button, Checkbox, Field, Input, Radio, RadioGroup, Switch, Textarea } from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type FormEvent } from "react";
import { expect, userEvent, within } from "storybook/test";

const meta: Meta = {
  title: "Components/Forms",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "`Field` provides the label, description and error message and wires `id`, `aria-describedby` and `aria-invalid` into any Orbit control inside it.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

export const Inputs: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      <Field label="Summary" description="A short, specific title for the issue.">
        <Input placeholder="What needs to be done?" />
      </Field>
      <Field label="Search">
        <Input leading={<Search size={15} />} placeholder="Search issues" />
      </Field>
      <Field label="Email" required error="Enter a valid email address.">
        <Input type="email" defaultValue="daniel@" leading={<AtSign size={15} />} />
      </Field>
      <Field label="Disabled" disabled>
        <Input defaultValue="Read-only value" />
      </Field>
      <Field label="Description">
        <Textarea placeholder="Add context, acceptance criteria and links…" />
      </Field>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Input size="sm" aria-label="Small" placeholder="Small" />
        <Input size="md" aria-label="Medium" placeholder="Medium" />
        <Input size="lg" aria-label="Large" placeholder="Large" />
      </div>
    </div>
  ),
};

function ValidationForm() {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Enter a summary for the issue.");
    setError(undefined);
    setSaved(true);
  };
  return (
    <form onSubmit={submit} noValidate style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      <Field label="Summary" required error={error}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Button type="submit" variant="aero">
        Create issue
      </Button>
      {saved && <p role="status">Issue created.</p>}
    </form>
  );
}

/** Errors are announced (`role="alert"`) and linked to the input via `aria-describedby`. */
export const AccessibleValidation: Story = {
  render: () => <ValidationForm />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Create issue" }));
    const input = c.getByLabelText(/Summary/);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(/Enter a summary/);
    await userEvent.type(input, "Rate-limit the public API");
    await userEvent.click(c.getByRole("button", { name: "Create issue" }));
    await expect(c.getByRole("status")).toHaveTextContent("Issue created.");
  },
};

export const Choices: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gap: 24,
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        maxWidth: 820,
      }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <Checkbox label="Notify watchers" defaultChecked />
        <Checkbox label="Include subtasks" description="Copies all subtasks to the new issue." />
        <Checkbox label="Partially selected" checked="indeterminate" />
        <Checkbox label="Disabled" disabled />
      </div>
      <RadioGroup defaultValue="sprint" aria-label="Destination">
        <Radio value="sprint" label="Current sprint" description="Sprint 24 · ends Oct 12" />
        <Radio value="backlog" label="Backlog" />
        <Radio value="archive" label="Archive" disabled />
      </RadioGroup>
      <div style={{ display: "grid", gap: 14 }}>
        <Switch label="Email notifications" defaultChecked />
        <Switch label="Compact cards" description="Hide labels on board cards." />
        <Switch label="Small switch" size="sm" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const sw = c.getByRole("switch", { name: "Compact cards" });
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "true");
    const cb = c.getByRole("checkbox", { name: "Include subtasks" });
    await userEvent.click(cb);
    await expect(cb).toBeChecked();
  },
};
