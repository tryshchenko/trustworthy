import {
  ActivityFeed,
  Avatar,
  AvatarGroup,
  CommentThread,
  GlassPanel,
  ProgressSummary,
  SprintHeader,
  type Comment,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { people } from "./fixtures";

const meta: Meta = { title: "Product/Planning & activity", tags: ["autodocs"] };
export default meta;
const now = new Date("2026-10-03T12:00:00Z");

export const Sprint: StoryObj = {
  name: "SprintHeader",
  render: () => (
    <GlassPanel padding="md">
      <SprintHeader
        name="Sprint 24"
        startDate="2026-09-28"
        endDate="2026-10-12"
        remaining="9 days left"
        goal="Ship SSO for enterprise workspaces and cut board load time in half."
        segments={[
          { label: "To do", value: 9, tone: "neutral" },
          { label: "In progress", value: 5, tone: "info" },
          { label: "In review", value: 4, tone: "discovery" },
          { label: "Done", value: 5, tone: "success" },
        ]}
        actions={
          <AvatarGroup max={3}>
            {people.map((p) => (
              <Avatar key={p.id} name={p.name} size="sm" />
            ))}
          </AvatarGroup>
        }
      />
    </GlassPanel>
  ),
};

export const Summary: StoryObj = {
  name: "ProgressSummary",
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <ProgressSummary
        label="Story points by status"
        unit="pts"
        segments={[
          { label: "Done", value: 21, tone: "success" },
          { label: "In review", value: 8, tone: "discovery" },
          { label: "In progress", value: 13, tone: "info" },
          { label: "To do", value: 18, tone: "neutral" },
        ]}
      />
    </div>
  ),
};

export const Activity: StoryObj = {
  name: "ActivityFeed",
  render: () => (
    <div style={{ maxWidth: 460 }}>
      <ActivityFeed
        now={now}
        items={[
          {
            id: "1",
            actor: { name: "Daniel Kim" },
            action: "moved PLAT-87 to In review",
            timestamp: "2026-10-03T11:40:00Z",
          },
          {
            id: "2",
            actor: { name: "Lena Fischer" },
            action: "commented on PLAT-89",
            timestamp: "2026-10-03T09:00:00Z",
          },
          {
            id: "3",
            actor: { name: "Marco Silva" },
            action: "created PLAT-90",
            timestamp: "2026-10-01T15:20:00Z",
          },
        ]}
      />
    </div>
  ),
};

function Thread() {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      author: { name: "Daniel Kim" },
      body: "Pushed the SAML parser — please review the clock-skew handling.",
      createdAt: "2026-10-03T08:00:00Z",
    },
    {
      id: "2",
      author: { name: "Samuel Okafor" },
      body: "Tested with Okta and Entra ID; both pass.",
      createdAt: "2026-10-03T10:15:00Z",
      edited: true,
    },
  ]);
  return (
    <div style={{ maxWidth: 520 }}>
      <CommentThread
        now={now}
        currentUser={{ name: "Priya Raman" }}
        comments={comments}
        onSubmit={(body) =>
          setComments((c) => [
            ...c,
            {
              id: String(c.length + 1),
              author: { name: "Priya Raman" },
              body,
              createdAt: now.toISOString(),
            },
          ])
        }
      />
    </div>
  );
}

export const Comments: StoryObj = {
  name: "CommentThread",
  render: () => <Thread />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("textbox", { name: "Comment" }), "Looks great — merging.");
    await userEvent.click(c.getByRole("button", { name: "Comment" }));
    await expect(c.getByText("Looks great — merging.")).toBeInTheDocument();
  },
};
