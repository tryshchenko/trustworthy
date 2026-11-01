import { Inbox, Plus, Sparkles } from "@orbit/icons";
import {
  AeroButton,
  Avatar,
  AvatarGroup,
  Badge,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  Kbd,
  Panel,
  Progress,
  Separator,
  Skeleton,
  Spinner,
  Tag,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { people } from "./fixtures";

const meta: Meta = { title: "Components/Data display", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

const row = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } as const;

export const Badges: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={row}>
        {(
          [
            "info",
            "success",
            "warning",
            "danger",
            "neutral",
            "discovery",
            "teal",
            "accent",
          ] as const
        ).map((v) => (
          <Badge key={v} variant={v}>
            {v}
          </Badge>
        ))}
      </div>
      <div style={row}>
        {(["info", "success", "warning", "danger"] as const).map((v) => (
          <Badge key={v} variant={v} appearance="solid">
            {v}
          </Badge>
        ))}
        <Badge variant="info" appearance="outline">
          Outline
        </Badge>
        <Badge size="sm" variant="accent">
          12
        </Badge>
      </div>
    </div>
  ),
};

function TagsDemo() {
  const [tags, setTags] = useState(["Backend", "Security", "API"]);
  return (
    <div style={row}>
      {tags.map((t, i) => (
        <Tag
          key={t}
          color={(["info", "danger", "teal"] as const)[i % 3]}
          onRemove={() => setTags((x) => x.filter((y) => y !== t))}
        >
          {t}
        </Tag>
      ))}
      <Tag color="#F0890B">Custom colour</Tag>
      <Tag size="sm" color="discovery">
        Small
      </Tag>
    </div>
  );
}

export const Tags: Story = {
  render: () => <TagsDemo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Remove Security" }));
    await expect(c.queryByText("Security")).not.toBeInTheDocument();
  },
};

export const Avatars: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={row}>
        {(["xs", "sm", "md", "lg"] as const).map((s) => (
          <Avatar key={s} name="Daniel Kim" size={s} status="online" />
        ))}
        <Avatar name="Lena Fischer" size="lg" status="away" />
        <Avatar name="Samuel Okafor" size="lg" status="offline" />
      </div>
      <AvatarGroup max={4} aria-label="Team">
        {people.map((p) => (
          <Avatar key={p.id} name={p.name} />
        ))}
      </AvatarGroup>
    </div>
  ),
};

export const CardsAndPanels: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      }}
    >
      <Card>
        <strong>Solid card</strong>
        <p style={{ margin: "6px 0 0", color: "var(--orb-color-text-secondary)" }}>
          The default surface for dense content.
        </p>
      </Card>
      <Card variant="glass">
        <strong>Glass card</strong>
        <p style={{ margin: "6px 0 0", color: "var(--orb-color-text-secondary)" }}>
          For a few hero surfaces only.
        </p>
      </Card>
      <Card interactive tabIndex={0}>
        <strong>Interactive</strong>
        <p style={{ margin: "6px 0 0", color: "var(--orb-color-text-secondary)" }}>
          Lifts on hover.
        </p>
      </Card>
      <Card selected>
        <strong>Selected</strong>
        <p style={{ margin: "6px 0 0", color: "var(--orb-color-text-secondary)" }}>
          Accent border.
        </p>
      </Card>
      <Panel
        title="Sprint health"
        description="Updated 5 minutes ago"
        actions={
          <Button size="sm" variant="ghost">
            View
          </Button>
        }
        style={{ gridColumn: "1 / -1" }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <Progress value={62} label="Sprint progress" showValue />
          <Progress value={88} tone="warning" label="Capacity" showValue />
          <Progress value={null} label="Syncing" size="sm" />
        </div>
      </Panel>
    </div>
  ),
};

export const Feedback: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 20, maxWidth: 520 }}>
      <div style={row}>
        <Spinner size="sm" label="Loading" />
        <Spinner label="Loading" />
        <Spinner size="lg" label="Loading" />
      </div>
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading issue"
        className="orb-card orb-card--solid orb-pad-md"
        style={{ display: "grid", gap: 12 }}
      >
        <div style={row}>
          <Skeleton width={32} height={32} radius="full" />
          <Skeleton width={180} height={14} />
        </div>
        <Skeleton lines={3} />
      </div>
      <p style={{ margin: 0 }}>
        Press <Kbd>⌘</Kbd>
        <Kbd>K</Kbd> to open the command palette.
      </p>
      <Separator glow />
    </div>
  ),
};

export const EmptyStates: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}
    >
      <Card>
        <EmptyState
          icon={<Sparkles size={24} />}
          title="Start your first sprint"
          description="Plan a sprint to focus the team on a two-week goal."
          actions={<AeroButton leadingIcon={<Plus size={15} />}>Create sprint</AeroButton>}
        />
      </Card>
      <Card>
        <EmptyState
          size="sm"
          icon={<Inbox size={18} />}
          title="Nothing in review"
          description="Drag a card here when it's ready."
        />
      </Card>
    </div>
  ),
};

export const BreadcrumbStory: Story = {
  name: "Breadcrumb",
  render: () => (
    <Breadcrumb
      items={[
        { label: "Projects", href: "#" },
        { label: "Orbit Platform", href: "#" },
        { label: "PLAT-87" },
      ]}
    />
  ),
};
