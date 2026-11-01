import {
  Bell,
  CalendarDays,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  OrbitLogo,
  Plus,
  Settings,
} from "@orbit/icons";
import {
  AeroBackground,
  AeroButton,
  AeroHeader,
  AeroSidebar,
  Avatar,
  GlassPanel,
  HeaderSearch,
  IconButton,
  ProjectSwitcher,
  SidebarItem,
  SidebarSection,
  StatusPill,
  type GlassPanelProps,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { projects } from "./fixtures";

const meta: Meta = {
  title: "Aero/Signature components",
  tags: ["autodocs"],
  parameters: {
    orbitBackground: "full",
    docs: {
      description: {
        component:
          "Signature Aero components. Glass is applied to *chrome* — one blurred sidebar, one header, overlays — never to repeated content.",
      },
    },
  },
};
export default meta;

export const GlassPanelPlayground: StoryObj<GlassPanelProps> = {
  name: "GlassPanel",
  args: {
    variant: "standard",
    elevation: "raised",
    blur: "material",
    padding: "lg",
    radius: "xl",
    border: "luminous",
    interactive: false,
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["subtle", "standard", "raised", "solid", "selected"],
    },
    elevation: { control: "inline-radio", options: ["flat", "low", "raised", "floating"] },
    blur: { control: "inline-radio", options: ["material", "none", "sm", "md", "lg"] },
    padding: { control: "inline-radio", options: ["none", "sm", "md", "lg"] },
    radius: { control: "inline-radio", options: ["none", "md", "lg", "xl", "2xl"] },
    border: { control: "inline-radio", options: ["none", "hairline", "luminous"] },
    interactive: { control: "boolean" },
  },
  render: (args) => (
    <div style={{ display: "grid", placeItems: "center", minHeight: 360 }}>
      <GlassPanel {...args} style={{ width: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <OrbitLogo size={36} />
          <div>
            <strong>Sprint 24</strong>
            <div style={{ fontSize: 13, color: "var(--orb-color-text-secondary)" }}>
              Ship SSO for enterprise workspaces
            </div>
          </div>
        </div>
        <p style={{ margin: "16px 0", color: "var(--orb-color-text-secondary)" }}>
          Frosted glass: translucent fill, background blur and saturation, a luminous 1px border, a
          top-edge highlight and diffuse shadow.
        </p>
        <AeroButton>Start sprint</AeroButton>
      </GlassPanel>
    </div>
  ),
};

export const StatusPills: StoryObj = {
  name: "StatusPill",
  parameters: { orbitBackground: "soft" },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusPill tone="neutral" shape="todo">
          To do
        </StatusPill>
        <StatusPill tone="info" shape="progress">
          In progress
        </StatusPill>
        <StatusPill tone="discovery" shape="review">
          In review
        </StatusPill>
        <StatusPill tone="success" shape="done">
          Done
        </StatusPill>
        <StatusPill tone="danger" shape="blocked">
          Blocked
        </StatusPill>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusPill size="sm" tone="info" shape="progress" appearance="outline">
          In progress
        </StatusPill>
        <StatusPill size="sm" tone="warning">
          At risk
        </StatusPill>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "var(--orb-color-text-secondary)" }}>
        Each status has a distinct glyph shape and text, so meaning never depends on colour alone.
      </p>
    </div>
  ),
};

function SidebarDemo({ compact }: { compact?: boolean }) {
  return (
    <AeroSidebar
      label={compact ? "Compact navigation" : "Main navigation"}
      defaultCompact={compact}
      header={
        <ProjectSwitcher
          projects={projects}
          value="plat"
          onValueChange={() => {}}
          compact={compact}
        />
      }
      footer={
        <SidebarItem href="#" icon={<Settings size={18} />}>
          Settings
        </SidebarItem>
      }
      style={{ height: 560 }}
    >
      <SidebarSection title="Planning">
        <SidebarItem href="#" icon={<LayoutDashboard size={18} />}>
          Overview
        </SidebarItem>
        <SidebarItem href="#" icon={<KanbanSquare size={18} />} active badge={23}>
          Board
        </SidebarItem>
        <SidebarItem href="#" icon={<ListTodo size={18} />} badge={48}>
          Issues
        </SidebarItem>
        <SidebarItem href="#" icon={<CalendarDays size={18} />}>
          Calendar
        </SidebarItem>
      </SidebarSection>
      <SidebarSection title="Starred" collapsible>
        {projects.map((p) => (
          <SidebarItem key={p.id} href="#">
            {p.name}
          </SidebarItem>
        ))}
      </SidebarSection>
    </AeroSidebar>
  );
}

export const Sidebar: StoryObj = {
  name: "AeroSidebar",
  render: () => (
    <div style={{ display: "flex", gap: 24 }}>
      <SidebarDemo />
      <SidebarDemo compact />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const nav = c.getAllByRole("navigation", { name: "Main navigation" })[0]!;
    const n = within(nav);
    await expect(n.getByRole("link", { name: /Board/ })).toHaveAttribute("aria-current", "page");
    const toggle = n.getByRole("button", { name: "Starred" });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  },
};

export const Header: StoryObj = {
  name: "AeroHeader",
  render: () => (
    <AeroHeader
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
          <Avatar name="Priya Raman" size="sm" status="online" />
        </>
      }
    />
  ),
};

export const Background: StoryObj = {
  name: "AeroBackground",
  parameters: { orbitBackground: "none" },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {(["none", "soft", "full"] as const).map((s) => (
        <div
          key={s}
          style={{
            position: "relative",
            height: 260,
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "var(--orb-shadow-md)",
          }}
        >
          <AeroBackground position="absolute" scenery={s} />
          <span style={{ position: "absolute", left: 14, top: 12, fontWeight: 600 }}>
            scenery=&quot;{s}&quot;
          </span>
        </div>
      ))}
    </div>
  ),
};
