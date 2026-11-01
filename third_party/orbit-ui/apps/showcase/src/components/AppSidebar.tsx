import { memo } from "react";
import {
  BarChart3,
  CalendarDays,
  CircleHelp,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  Map as MapIcon,
  OrbitLogo,
  Plus,
  Settings,
  Users,
} from "@orbit/icons";
import {
  AeroSidebar,
  IconButton,
  ProjectSwitcher,
  SidebarItem,
  SidebarSection,
  toast,
} from "@orbit/ui";
import { projects } from "../data/mock";
import { href, type ViewId } from "../state/route";

interface Props {
  view: ViewId;
  compact: boolean;
  onCompactChange: (v: boolean) => void;
  onNavigate: (view: ViewId) => void;
  onShowShortcuts: () => void;
  boardCount: number;
  issueCount: number;
}

export const AppSidebar = memo(function AppSidebar({
  view,
  compact,
  onCompactChange,
  onNavigate,
  onShowShortcuts,
  boardCount,
  issueCount,
}: Props) {
  const go = (v: ViewId) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(v);
  };
  return (
    <AeroSidebar
      compact={compact}
      onCompactChange={onCompactChange}
      header={
        <ProjectSwitcher
          compact={compact}
          projects={projects}
          value="plat"
          onValueChange={(id) =>
            id !== "plat" &&
            toast({
              title: "Only Orbit Platform has demo data",
              description: "Project switching is simplified in this demo.",
              tone: "info",
            })
          }
          onCreateProject={() =>
            toast({ title: "Creating projects isn't part of this demo", tone: "info" })
          }
        />
      }
      footer={
        <>
          <SidebarItem
            as="button"
            icon={<CircleHelp size={18} />}
            onClick={onShowShortcuts}
            data-close-drawer
          >
            Keyboard shortcuts
          </SidebarItem>
          <SidebarItem
            href={href({ view: "settings" })}
            onClick={go("settings")}
            icon={<Settings size={18} />}
            active={view === "settings"}
          >
            Settings
          </SidebarItem>
        </>
      }
    >
      <SidebarSection title="Planning">
        <SidebarItem
          href={href({ view: "overview" })}
          onClick={go("overview")}
          icon={<LayoutDashboard size={18} />}
          active={view === "overview"}
        >
          Overview
        </SidebarItem>
        <SidebarItem
          href={href({ view: "board" })}
          onClick={go("board")}
          icon={<KanbanSquare size={18} />}
          active={view === "board"}
          badge={boardCount}
        >
          Board
        </SidebarItem>
        <SidebarItem
          href={href({ view: "issues" })}
          onClick={go("issues")}
          icon={<ListTodo size={18} />}
          active={view === "issues"}
          badge={issueCount}
        >
          Issues
        </SidebarItem>
        <SidebarItem
          href={href({ view: "roadmap" })}
          onClick={go("roadmap")}
          icon={<MapIcon size={18} />}
          active={view === "roadmap"}
        >
          Roadmap
        </SidebarItem>
        <SidebarItem
          href={href({ view: "calendar" })}
          onClick={go("calendar")}
          icon={<CalendarDays size={18} />}
          active={view === "calendar"}
        >
          Calendar
        </SidebarItem>
        <SidebarItem
          href={href({ view: "reports" })}
          onClick={go("reports")}
          icon={<BarChart3 size={18} />}
          active={view === "reports"}
        >
          Reports
        </SidebarItem>
      </SidebarSection>
      <SidebarSection
        title="Starred projects"
        collapsible
        action={
          !compact && (
            <IconButton
              size="sm"
              label="Add starred project"
              icon={<Plus size={14} />}
              onClick={() =>
                toast({ title: "Starring projects isn't part of this demo", tone: "info" })
              }
            />
          )
        }
      >
        {projects.map((p) => (
          <SidebarItem
            key={p.id}
            as="button"
            icon={
              <span
                className="orb-project-icon"
                style={{
                  width: 18,
                  height: 18,
                  fontSize: 8,
                  borderRadius: 5,
                  ["--orb-project-color" as string]: p.color,
                }}
              >
                {p.key.slice(0, 1)}
              </span>
            }
            active={false}
            onClick={() =>
              p.id === "plat"
                ? onNavigate("board")
                : toast({ title: `${p.name} has no demo data`, tone: "info" })
            }
            data-close-drawer
          >
            {p.name}
          </SidebarItem>
        ))}
      </SidebarSection>
      <SidebarSection title="Team" collapsible defaultOpen={false}>
        <SidebarItem
          as="button"
          icon={<Users size={18} />}
          onClick={() => onNavigate("overview")}
          data-close-drawer
        >
          Platform squad
        </SidebarItem>
        <SidebarItem
          as="button"
          icon={<OrbitLogo size={18} />}
          onClick={() => onNavigate("overview")}
          data-close-drawer
        >
          Workspace
        </SidebarItem>
      </SidebarSection>
    </AeroSidebar>
  );
});
