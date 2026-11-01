import { MoreHorizontal } from "@orbit/icons";
import {
  ActivityFeed,
  AeroButton,
  AssigneeSelector,
  Checkbox,
  CommentThread,
  DatePicker,
  EditableText,
  FloatingInspector,
  IconButton,
  IssueDetailPanel,
  IssueDetailSection,
  IssueEditor,
  IssueTypeIcon,
  PrioritySelector,
  Progress,
  StatusSelector,
  type Comment,
  type IssueDraft,
  type IssuePriority,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { labels, people, statuses } from "./fixtures";

const meta: Meta = {
  title: "Product/Issue details",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "`IssueDetailPanel` is a layout with slots (title, toolbar, properties, sections). Wire in `EditableText`, selectors and threads — the library holds no issue state.",
      },
    },
  },
};
export default meta;

const now = new Date("2026-10-03T12:00:00Z");

function Details() {
  const [title, setTitle] = useState("User authentication with SSO");
  const [description, setDescription] = useState(
    "Allow enterprise workspaces to sign in with SAML 2.0 and OIDC identity providers.",
  );
  const [status, setStatus] = useState("in-progress");
  const [assignee, setAssignee] = useState<string | null>("daniel");
  const [priority, setPriority] = useState<IssuePriority>("high");
  const [due, setDue] = useState<string | null>("2026-10-07");
  const [subtasks, setSubtasks] = useState([
    { id: "a", title: "SAML assertion parsing", done: true },
    { id: "b", title: "OIDC discovery + JWKS caching", done: true },
    { id: "c", title: "Just-in-time provisioning", done: false },
  ]);
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      author: { name: "Lena Fischer" },
      body: "Can we show the IdP logo on the login screen?",
      createdAt: "2026-10-03T09:10:00Z",
    },
  ]);
  const done = subtasks.filter((s) => s.done).length;
  return (
    <IssueDetailPanel
      title={<EditableText as="h2" label="Summary" value={title} onCommit={setTitle} />}
      toolbar={<StatusSelector value={status} onValueChange={setStatus} statuses={statuses} />}
      properties={[
        {
          label: "Assignee",
          controlId: "p-assignee",
          value: (
            <AssigneeSelector
              id="p-assignee"
              appearance="ghost"
              size="sm"
              people={people}
              value={assignee}
              onValueChange={setAssignee}
            />
          ),
        },
        {
          label: "Priority",
          controlId: "p-priority",
          value: (
            <PrioritySelector
              id="p-priority"
              appearance="ghost"
              size="sm"
              value={priority}
              onValueChange={setPriority}
            />
          ),
        },
        {
          label: "Due date",
          controlId: "p-due",
          value: (
            <DatePicker
              id="p-due"
              appearance="ghost"
              size="sm"
              value={due}
              onValueChange={setDue}
              clearable
              onClear={() => setDue(null)}
            />
          ),
        },
      ]}
    >
      <IssueDetailSection title="Description">
        <EditableText multiline label="Description" value={description} onCommit={setDescription} />
      </IssueDetailSection>
      <IssueDetailSection title="Subtasks" meta={`${done} of ${subtasks.length}`}>
        <Progress value={done} max={subtasks.length} size="sm" label="Subtask progress" />
        {subtasks.map((s) => (
          <Checkbox
            key={s.id}
            label={s.title}
            checked={s.done}
            onCheckedChange={() =>
              setSubtasks((xs) => xs.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))
            }
          />
        ))}
      </IssueDetailSection>
      <IssueDetailSection title="Comments" meta={comments.length}>
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
      </IssueDetailSection>
      <IssueDetailSection title="Activity">
        <ActivityFeed
          now={now}
          items={[
            {
              id: "1",
              actor: { name: "Daniel Kim" },
              action: "moved this to In progress",
              timestamp: "2026-10-03T08:00:00Z",
            },
            {
              id: "2",
              actor: { name: "Marco Silva" },
              action: "created this issue",
              timestamp: "2026-09-29T14:30:00Z",
            },
          ]}
        />
      </IssueDetailSection>
    </IssueDetailPanel>
  );
}

export const DetailPanel: StoryObj = {
  render: () => (
    <div className="orb-card orb-card--solid orb-pad-lg" style={{ maxWidth: 560 }}>
      <Details />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Summary: User authentication/ }));
    const input = c.getByRole("textbox", { name: "Summary" });
    await userEvent.clear(input);
    await userEvent.type(input, "SSO for enterprise workspaces{Enter}");
    await expect(
      c.getByRole("button", { name: /Summary: SSO for enterprise workspaces/ }),
    ).toBeInTheDocument();
  },
};

export const SplitLayout: StoryObj = {
  render: () => (
    <div className="orb-card orb-card--solid orb-pad-lg" style={{ maxWidth: 980 }}>
      <IssueDetailPanel
        layout="split"
        title={
          <EditableText
            as="h2"
            label="Summary"
            value="Rate-limit public REST API"
            onCommit={() => {}}
          />
        }
        properties={[
          { label: "Assignee", value: "Marco Silva" },
          { label: "Priority", value: "High" },
          { label: "Sprint", value: "Sprint 24" },
        ]}
      >
        <IssueDetailSection title="Description">
          <p style={{ margin: 0 }}>
            Token-bucket limits per API key with Retry-After headers and dashboard visibility.
          </p>
        </IssueDetailSection>
      </IssueDetailPanel>
    </div>
  ),
};

function InspectorDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ display: "flex", gap: 12, height: "100%", padding: 12, boxSizing: "border-box" }}>
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <AeroButton onClick={() => setOpen(true)}>Open inspector</AeroButton>
      </div>
      <FloatingInspector
        open={open}
        onOpenChange={setOpen}
        title={
          <span className="orb-inline">
            <IssueTypeIcon type="story" /> PLAT-87
          </span>
        }
        actions={<IconButton label="More actions" icon={<MoreHorizontal size={18} />} />}
      >
        <Details />
      </FloatingInspector>
    </div>
  );
}

/** Docked beside content on desktop (non-modal); full-screen dialog below 768px — try the mobile viewport. */
export const Inspector: StoryObj = {
  parameters: { orbitLayout: "fullscreen" },
  render: () => <InspectorDemo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const panel = await c.findByRole("complementary", { name: /PLAT-87/ });
    await waitFor(() => expect(panel).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(c.queryByRole("complementary", { name: /PLAT-87/ })).not.toBeInTheDocument(),
    );
  },
};

export const Editor: StoryObj<{ onSubmit: (draft: IssueDraft) => void }> = {
  args: { onSubmit: fn() },
  render: (args) => (
    <div className="orb-card orb-card--solid orb-pad-lg" style={{ maxWidth: 600 }}>
      <IssueEditor
        people={people}
        statuses={statuses}
        labels={labels}
        onSubmit={args.onSubmit}
        onCancel={() => {}}
      />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Create issue" }));
    const summary = c.getByRole("textbox", { name: /Summary/ });
    await expect(summary).toHaveAttribute("aria-invalid", "true");
    await expect(summary).toHaveFocus();
    await userEvent.type(summary, "Add audit log export");
    await userEvent.click(c.getByRole("button", { name: "Create issue" }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Add audit log export", status: "todo" }),
    );
  },
};
