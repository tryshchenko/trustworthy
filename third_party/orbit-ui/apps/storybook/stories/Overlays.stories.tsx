import { Copy, Link2, MoreHorizontal, Pencil, Trash2 } from "@orbit/icons";
import {
  AeroButton,
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Field,
  IconButton,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  toast,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta: Meta = {
  title: "Components/Overlays",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Overlays use the **raised glass** material. All are built on Radix primitives: focus is trapped in modal dialogs and restored on close, Escape dismisses, and popovers reposition to stay in view.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

export const TooltipStory: Story = {
  name: "Tooltip",
  render: () => (
    <div style={{ display: "flex", gap: 12, padding: 40 }}>
      <Tooltip content="Copy issue link">
        <Button variant="secondary" leadingIcon={<Link2 size={15} />}>
          Hover or focus me
        </Button>
      </Tooltip>
      <Tooltip content="Tooltips are supplementary — never the only label" side="bottom">
        <IconButton label="Edit" tooltip={false} icon={<Pencil size={16} />} />
      </Tooltip>
    </div>
  ),
};

export const PopoverStory: Story = {
  name: "Popover",
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary">Quick filter</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div style={{ display: "grid", gap: 12, width: 260 }}>
          <strong>Filter by text</strong>
          <Field label="Contains" hideLabel>
            <Input placeholder="Contains…" size="sm" />
          </Field>
          <AeroButton size="sm">Apply</AeroButton>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const DropdownMenuStory: Story = {
  name: "DropdownMenu",
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Issue actions" variant="secondary" icon={<MoreHorizontal size={18} />} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>PLAT-87</DropdownMenuLabel>
        <DropdownMenuItem icon={<Pencil size={15} />} shortcut="E">
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Copy size={15} />} shortcut="⌘C">
          Copy key
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem checked>Watching</DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<Trash2 size={15} />} tone="danger">
          Delete…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Issue actions" }));
    await expect(await c.findByRole("menuitem", { name: /Edit/ })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(c.queryByRole("menu")).not.toBeInTheDocument());
  },
};

export const DialogStory: Story = {
  name: "Dialog",
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <AeroButton>Rename sprint</AeroButton>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Rename sprint</DialogTitle>
          <DialogDescription>Sprint names appear on boards and reports.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Field label="Name">
            <Input defaultValue="Sprint 24" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <AeroButton>Save</AeroButton>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const trigger = c.getByRole("button", { name: "Rename sprint" });
    await userEvent.click(trigger);
    const dialog = await c.findByRole("dialog", { name: "Rename sprint" });
    await expect(dialog).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(c.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const DrawerStory: Story = {
  name: "Drawer",
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary">Open drawer</Button>
      </DrawerTrigger>
      <DrawerContent side="right" aria-describedby={undefined}>
        <div style={{ padding: 20, display: "grid", gap: 12 }}>
          <DrawerTitle>Board settings</DrawerTitle>
          <p style={{ margin: 0, color: "var(--orb-color-text-secondary)" }}>
            Drawers are modal panels anchored to an edge.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};

export const Toasts: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: "PLAT-112 created",
            description: "Rate-limit public REST API",
            tone: "success",
            action: { label: "View", onClick: () => {} },
          })
        }
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ title: "Sprint ends in 2 days", tone: "info" })}
      >
        Info
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ title: "3 issues are over WIP limit", tone: "warning" })}
      >
        Warning
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: "Couldn't save changes",
            description: "Check your connection and try again.",
            tone: "danger",
          })
        }
      >
        Danger
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Info" }));
    await expect(await c.findByText("Sprint ends in 2 days")).toBeInTheDocument();
  },
};
