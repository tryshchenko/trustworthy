import { KanbanSquare, LayoutDashboard, ListTodo } from "@orbit/icons";
import { ScrollArea, Tabs, TabsContent, TabsList, TabsTrigger } from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

const meta: Meta = { title: "Components/Navigation", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const UnderlineTabs: Story = {
  render: () => (
    <Tabs defaultValue="board">
      <TabsList aria-label="Project views">
        <TabsTrigger value="overview" icon={<LayoutDashboard size={15} />}>
          Overview
        </TabsTrigger>
        <TabsTrigger value="issues" icon={<ListTodo size={15} />} count={24}>
          Issues
        </TabsTrigger>
        <TabsTrigger value="board" icon={<KanbanSquare size={15} />}>
          Board
        </TabsTrigger>
        <TabsTrigger value="reports" disabled>
          Reports
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" style={{ paddingTop: 16 }}>
        Overview content
      </TabsContent>
      <TabsContent value="issues" style={{ paddingTop: 16 }}>
        Issues content
      </TabsContent>
      <TabsContent value="board" style={{ paddingTop: 16 }}>
        Board content
      </TabsContent>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const board = c.getByRole("tab", { name: "Board" });
    board.focus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(c.getByRole("tab", { name: /Issues/ })).toHaveAttribute("aria-selected", "true");
    await expect(c.getByRole("tabpanel")).toHaveTextContent("Issues content");
  },
};

export const PillTabs: Story = {
  render: () => (
    <Tabs defaultValue="week">
      <TabsList variant="pill" aria-label="Range">
        <TabsTrigger value="day">Day</TabsTrigger>
        <TabsTrigger value="week">Week</TabsTrigger>
        <TabsTrigger value="month">Month</TabsTrigger>
      </TabsList>
      <TabsContent value="day" style={{ paddingTop: 12 }}>
        3 issues due today
      </TabsContent>
      <TabsContent value="week" style={{ paddingTop: 12 }}>
        14 issues due this week
      </TabsContent>
      <TabsContent value="month" style={{ paddingTop: 12 }}>
        41 issues due this month
      </TabsContent>
    </Tabs>
  ),
};

export const ScrollAreaStory: Story = {
  name: "ScrollArea",
  render: () => (
    <ScrollArea
      style={{ height: 220, width: 320 }}
      className="orb-card orb-card--solid"
      viewportProps={{ tabIndex: 0, "aria-label": "Changelog" }}
    >
      <div style={{ padding: 16, display: "grid", gap: 10 }}>
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i}>Release 2.{24 - i} — performance and accessibility fixes</div>
        ))}
      </div>
    </ScrollArea>
  ),
};
