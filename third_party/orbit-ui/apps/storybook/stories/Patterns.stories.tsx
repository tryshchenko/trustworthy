import {
  Bell,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  OrbitLogo,
  Plus,
  Settings,
} from "@orbit/icons";
import {
  AeroButton,
  AeroHeader,
  AeroSidebar,
  AppShell,
  Avatar,
  FilterBar,
  FloatingInspector,
  GlassPanel,
  HeaderSearch,
  IconButton,
  IssueCard,
  IssueDetailPanel,
  IssueDetailSection,
  IssueTypeIcon,
  KanbanBoard,
  ProjectSwitcher,
  SidebarItem,
  SidebarSection,
  SprintHeader,
  StatusSelector,
  defaultStatuses,
  type KanbanMove,
  type KanbanRenderState,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useMemo, useState } from "react";
import { issues as seed, projects, type StoryIssue } from "./fixtures";

const meta: Meta = {
  title: "Patterns/Project board",
  parameters: {
    orbitLayout: "fullscreen",
    orbitBackground: "none",
    docs: {
      description: {
        component:
          "A complete composition: `AppShell` + `AeroBackground` + `AeroSidebar` + `AeroHeader` + `SprintHeader` + `FilterBar` + `KanbanBoard` + `FloatingInspector`. Resize to the mobile viewport to see the drawer navigation and full-screen inspector.",
      },
    },
  },
};
export default meta;

const columns = defaultStatuses.map((s) => ({
  id: s.value,
  title: s.label,
  tone: s.tone,
  shape: s.shape,
}));

function ProjectBoard() {
  const [items, setItems] = useState(seed);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>("1");
  const [menu, setMenu] = useState(false);
  const visible = items.filter((i) =>
    `${i.key} ${i.title}`.toLowerCase().includes(query.toLowerCase()),
  );
  const byColumn = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.id, visible.filter((i) => i.status === c.id)])),
    [visible],
  );
  const onMove = useCallback(
    ({ itemId, toColumnId }: KanbanMove) =>
      setItems((xs) => xs.map((x) => (x.id === itemId ? { ...x, status: toColumnId } : x))),
    [],
  );
  const open = items.find((i) => i.id === openId);
  const render = useCallback(
    (i: StoryIssue, s: KanbanRenderState) => (
      <IssueCard
        {...s.dragHandleProps}
        issueKey={i.key}
        title={i.title}
        type={i.type}
        priority={i.priority}
        assignee={i.assignee}
        labels={i.labels}
        estimate={i.estimate}
        selected={i.id === openId}
        dragging={s.isOverlay}
        onOpen={() => setOpenId(i.id)}
      />
    ),
    [openId],
  );
  return (
    <AppShell
      style={{ height: "100%" }}
      sidebarOpen={menu}
      onSidebarOpenChange={setMenu}
      background={null}
      sidebar={
        <AeroSidebar
          header={<ProjectSwitcher projects={projects} value="plat" onValueChange={() => {}} />}
          footer={
            <SidebarItem href="#" icon={<Settings size={18} />}>
              Settings
            </SidebarItem>
          }
        >
          <SidebarSection title="Planning">
            <SidebarItem href="#" icon={<LayoutDashboard size={18} />}>
              Overview
            </SidebarItem>
            <SidebarItem href="#" icon={<KanbanSquare size={18} />} active badge={items.length}>
              Board
            </SidebarItem>
            <SidebarItem href="#" icon={<ListTodo size={18} />}>
              Issues
            </SidebarItem>
          </SidebarSection>
        </AeroSidebar>
      }
      header={
        <AeroHeader
          onMenuClick={() => setMenu(true)}
          logo={
            <>
              <OrbitLogo size={28} /> Orbit
            </>
          }
          search={<HeaderSearch />}
          actions={
            <>
              <AeroButton leadingIcon={<Plus size={16} />}>Create</AeroButton>
              <IconButton label="Notifications" icon={<Bell size={18} />} />
              <Avatar name="Priya Raman" size="sm" />
            </>
          }
        />
      }
      aside={
        <FloatingInspector
          open={Boolean(open)}
          onOpenChange={(o) => !o && setOpenId(null)}
          title={
            open && (
              <span className="orb-inline">
                <IssueTypeIcon type={open.type} /> {open.key}
              </span>
            )
          }
        >
          {open && (
            <IssueDetailPanel
              title={<h2 style={{ margin: 0, fontSize: 20 }}>{open.title}</h2>}
              toolbar={
                <StatusSelector
                  value={open.status}
                  onValueChange={(s) =>
                    setItems((xs) => xs.map((x) => (x.id === open.id ? { ...x, status: s } : x)))
                  }
                />
              }
              properties={[
                { label: "Assignee", value: open.assignee?.name ?? "Unassigned" },
                { label: "Priority", value: open.priority },
              ]}
            >
              <IssueDetailSection title="Description">
                <p style={{ margin: 0, color: "var(--orb-color-text-secondary)" }}>
                  Drag cards, filter, or change status here — the board updates instantly.
                </p>
              </IssueDetailSection>
            </IssueDetailPanel>
          )}
        </FloatingInspector>
      }
    >
      <div
        style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", minHeight: 0 }}
      >
        <GlassPanel padding="sm" radius="lg">
          <SprintHeader
            name="Sprint 24"
            startDate="2026-09-28"
            endDate="2026-10-12"
            remaining="9 days left"
            goal="Ship SSO for enterprise workspaces."
          />
        </GlassPanel>
        <FilterBar query={query} onQueryChange={setQuery} />
        <div style={{ flex: 1, minHeight: 0 }}>
          <KanbanBoard
            columns={columns}
            itemsByColumn={byColumn}
            getItemId={(i) => i.id}
            getItemLabel={(i) => i.title}
            renderItem={render}
            onMoveItem={onMove}
          />
        </div>
      </div>
    </AppShell>
  );
}

/** The AeroBackground is supplied by the Storybook frame here; in an app pass it to `AppShell background`. */
export const ProjectBoardStory: StoryObj = {
  name: "Project board",
  parameters: { orbitBackground: "theme" },
  render: () => <ProjectBoard />,
};
