import { ArrowRight, Plus, Settings, Trash2 } from "@orbit/icons";
import { AeroButton, Button, IconButton } from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Create issue", onClick: fn() },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "aero", "secondary", "soft", "ghost", "danger"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Buttons trigger actions. Use **one** `aero` (or `primary`) button per region for the main action; `secondary` and `ghost` for everything else. `IconButton` always requires a `label` (accessible name + tooltip).",
      },
    },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { variant: "aero" },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole("button", { name: "Create issue" });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <AeroButton {...args} leadingIcon={<Plus size={16} />}>
        Create issue
      </AeroButton>
      <Button {...args} variant="primary">
        Save changes
      </Button>
      <Button {...args} variant="secondary">
        Share
      </Button>
      <Button {...args} variant="soft">
        Add to sprint
      </Button>
      <Button {...args} variant="ghost">
        Cancel
      </Button>
      <Button {...args} variant="danger" leadingIcon={<Trash2 size={15} />}>
        Delete
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <AeroButton key={size} {...args} size={size}>
          {size.toUpperCase()} button
        </AeroButton>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: (args) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, max-content)",
        gap: 12,
        alignItems: "center",
      }}
    >
      <AeroButton {...args}>Default</AeroButton>
      <AeroButton {...args} loading loadingLabel="Saving">
        Saving…
      </AeroButton>
      <AeroButton {...args} disabled>
        Disabled
      </AeroButton>
      <Button {...args} variant="secondary" trailingIcon={<ArrowRight size={15} />}>
        With icon
      </Button>
      <Button {...args} variant="secondary" loading>
        Loading
      </Button>
      <Button {...args} variant="secondary" disabled>
        Disabled
      </Button>
    </div>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <IconButton label="Settings" icon={<Settings size={18} />} />
      <IconButton label="Add" variant="secondary" icon={<Plus size={18} />} />
      <IconButton label="Delete" variant="danger" icon={<Trash2 size={16} />} />
      <IconButton label="Loading" loading icon={<Plus size={18} />} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Icon-only buttons expose their label as the accessible name.
    await expect(
      within(canvasElement).getByRole("button", { name: "Settings" }),
    ).toBeInTheDocument();
  },
};

export const AsLink: Story = {
  render: () => (
    <Button asChild variant="secondary">
      <a href="#docs">Read the docs</a>
    </Button>
  ),
};
