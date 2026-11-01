import {
  IssueCard,
  PriorityIndicator,
  IssueTypeIcon,
  defaultStatuses,
  priorityOrder,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { label } from "./fixtures";

const meta = {
  title: "Product/IssueCard",
  component: IssueCard,
  tags: ["autodocs"],
  args: {
    issueKey: "PLAT-87",
    title: "User authentication with SSO",
    type: "story",
    priority: "high",
    assignee: { name: "Daniel Kim" },
    labels: [label("backend"), label("security")],
    estimate: 8,
    dueDate: "2026-10-07",
    onOpen: fn(),
  },
  argTypes: {
    type: { control: "inline-radio", options: ["story", "task", "bug", "epic", "subtask"] },
    priority: { control: "inline-radio", options: priorityOrder },
    density: { control: "inline-radio", options: ["default", "compact"] },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Opaque (no blur) so hundreds can render cheaply. The whole card is one focusable button: **Enter** opens; on a `KanbanBoard`, **Space** picks it up. Screen readers hear key + title, then type, priority, assignee, labels and due date.",
      },
    },
  },
} satisfies Meta<typeof IssueCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const card = within(canvasElement).getByRole("button", {
      name: "PLAT-87: User authentication with SSO",
    });
    await expect(card).toHaveAccessibleDescription(
      /Story\. High priority\. Assigned to Daniel Kim/,
    );
    card.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onOpen).toHaveBeenCalled();
  },
};
export const Selected: Story = { args: { selected: true } };
export const Overdue: Story = {
  args: {
    overdue: true,
    dueDate: "2026-09-30",
    type: "bug",
    priority: "highest",
    title: "Session expires while typing a long comment",
  },
};
export const Unassigned: Story = {
  args: { assignee: null, labels: [], estimate: undefined, dueDate: undefined },
};
export const WithStatus: Story = { args: { status: defaultStatuses[1] } };
export const Dragging: Story = { args: { dragging: true } };
export const Compact: Story = { args: { density: "compact" } };

export const Indicators: StoryObj = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 16 }}>
        {(["story", "task", "bug", "epic", "subtask"] as const).map((t) => (
          <IssueTypeIcon key={t} type={t} showLabel />
        ))}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {priorityOrder.map((p) => (
          <PriorityIndicator key={p} priority={p} showLabel />
        ))}
      </div>
    </div>
  ),
};
