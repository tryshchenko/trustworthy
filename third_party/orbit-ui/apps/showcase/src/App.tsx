import {
  Contrast,
  KanbanSquare,
  Keyboard,
  LayoutDashboard,
  ListTodo,
  Moon,
  Plus,
  RotateCcw,
  Rows3,
  Settings,
  Sparkles,
  Sun,
} from "@orbit/icons";
import {
  AeroBackground,
  AppShell,
  CommandPalette,
  IssueTypeIcon,
  Tabs,
  TabsContent,
  Toaster,
  toast,
  useHotkey,
  useTheme,
  type CommandItem,
  type IssueDraft,
} from "@orbit/ui";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { AppSidebar } from "./components/AppSidebar";
import { CreateIssueDialog } from "./components/CreateIssueDialog";
import { IssueInspector } from "./components/IssueInspector";
import { ProjectHeader } from "./components/ProjectHeader";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { sprint, type StatusId } from "./data/mock";
import { emptyFilters, type IssueFilters } from "./state/filters";
import { useRoute, views, type ViewId } from "./state/route";
import { useIssues } from "./state/store";
import { BoardView } from "./views/BoardView";
import { IssuesView } from "./views/IssuesView";
import { OverviewView } from "./views/OverviewView";
import { SettingsView } from "./views/SettingsView";
import { UnavailableView } from "./views/UnavailableView";

export function App() {
  const { issues } = useIssues();
  const [route, navigate] = useRoute();
  const [filters, setFilters] = useState<IssueFilters>(emptyFilters);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<Partial<IssueDraft>>();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedIssue = route.issueKey ? issues.find((i) => i.key === route.issueKey) : undefined;

  const goTo = useCallback((view: ViewId) => navigate({ view, issueKey: null }), [navigate]);
  const openIssue = useCallback(
    (key: string) => {
      // Issues open in the board or issues view (where the inspector sits beside the list).
      const view = route.view === "issues" ? "issues" : "board";
      navigate({ view, issueKey: key });
    },
    [navigate, route.view],
  );
  const closeIssue = useCallback(
    () => navigate({ view: route.view, issueKey: null }, { replace: true }),
    [navigate, route.view],
  );
  const openCreate = useCallback((status?: StatusId) => {
    setCreateDefaults(status ? { status } : undefined);
    setCreateOpen(true);
  }, []);

  // Stable callbacks so the memoised shell (sidebar, header) skips re-rendering on keystrokes.
  const showShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openSettings = useCallback(() => goTo("settings"), [goTo]);
  const navigateFromSidebar = useCallback(
    (v: ViewId) => {
      goTo(v);
      setSidebarOpen(false);
    },
    [goTo],
  );

  useHotkey("mod+k", () => setPaletteOpen((o) => !o), { allowInInputs: true });
  useHotkey("c", () => openCreate());
  useHotkey("?", () => setShortcutsOpen(true));
  useHotkey("[", () => setCompact((c) => !c));
  useHotkey("/", () => {
    if (route.view !== "board") goTo("board");
    requestAnimationFrame(() => searchRef.current?.focus());
  });

  const showInspector = route.view === "board" || route.view === "issues";
  const sprintCount = issues.filter((i) => i.sprint === sprint.id).length;

  return (
    <>
      <AppShell
        background={<AeroBackground />}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
        sidebar={
          <AppSidebar
            view={route.view}
            compact={compact}
            onCompactChange={setCompact}
            onNavigate={navigateFromSidebar}
            onShowShortcuts={showShortcuts}
            boardCount={sprintCount}
            issueCount={issues.length}
          />
        }
        header={
          <AppHeader
            onMenu={openSidebar}
            onOpenPalette={openPalette}
            onCreate={openCreate}
            onOpenSettings={openSettings}
            onOpenIssue={openIssue}
          />
        }
        aside={showInspector && <IssueInspector issue={selectedIssue} onClose={closeIssue} />}
      >
        <Tabs
          value={route.view}
          onValueChange={(v) => goTo(v as ViewId)}
          className="flex min-h-0 flex-1 flex-col gap-3"
        >
          <ProjectHeader />
          {views.map((v) => (
            <TabsContent
              key={v.id}
              value={v.id}
              className="flex min-h-0 flex-1 flex-col"
              tabIndex={-1}
            >
              {v.id === "board" && (
                <BoardView
                  ref={searchRef}
                  filters={filters}
                  onFiltersChange={setFilters}
                  selectedKey={route.issueKey}
                  onOpenIssue={openIssue}
                  onCreate={openCreate}
                />
              )}
              {v.id === "issues" && (
                <IssuesView
                  filters={filters}
                  onFiltersChange={setFilters}
                  selectedKey={route.issueKey}
                  onOpenIssue={openIssue}
                />
              )}
              {v.id === "overview" && <OverviewView onOpenIssue={openIssue} />}
              {v.id === "settings" && <SettingsView />}
              {!v.available && <UnavailableView name={v.label} onGoToBoard={() => goTo("board")} />}
            </TabsContent>
          ))}
        </Tabs>
      </AppShell>

      <AppCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        goTo={goTo}
        openIssue={openIssue}
        openCreate={openCreate}
        showShortcuts={showShortcuts}
      />
      <CreateIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaults={createDefaults}
        onCreated={openIssue}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <Toaster />
    </>
  );
}

interface PaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goTo: (view: ViewId) => void;
  openIssue: (key: string) => void;
  openCreate: () => void;
  showShortcuts: () => void;
}

/**
 * Isolated so that theme/density changes (which the commands depend on) re-render
 * only the palette, not the whole application tree.
 */
const AppCommandPalette = memo(function AppCommandPalette({
  open,
  onOpenChange,
  goTo,
  openIssue,
  openCreate,
  showShortcuts,
}: PaletteProps) {
  const { issues, dispatch } = useIssues();
  const { theme, setTheme, density, setDensity } = useTheme();
  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "create",
        label: "Create issue",
        group: "Actions",
        icon: <Plus size={16} />,
        shortcut: "C",
        onSelect: () => openCreate(),
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        group: "Actions",
        icon: <Keyboard size={16} />,
        shortcut: "?",
        onSelect: showShortcuts,
      },
      {
        id: "nav-board",
        label: "Go to board",
        group: "Navigation",
        icon: <KanbanSquare size={16} />,
        keywords: ["kanban", "sprint"],
        onSelect: () => goTo("board"),
      },
      {
        id: "nav-issues",
        label: "Go to issues",
        group: "Navigation",
        icon: <ListTodo size={16} />,
        keywords: ["backlog", "list"],
        onSelect: () => goTo("issues"),
      },
      {
        id: "nav-overview",
        label: "Go to overview",
        group: "Navigation",
        icon: <LayoutDashboard size={16} />,
        keywords: ["dashboard"],
        onSelect: () => goTo("overview"),
      },
      {
        id: "nav-settings",
        label: "Go to settings",
        group: "Navigation",
        icon: <Settings size={16} />,
        onSelect: () => goTo("settings"),
      },
      {
        id: "theme-minimal",
        label: "Theme: Aero Minimal",
        group: "Appearance",
        icon: <Sun size={16} />,
        disabled: theme === "minimal",
        onSelect: () => setTheme("minimal"),
      },
      {
        id: "theme-scenic",
        label: "Theme: Aero Scenic",
        group: "Appearance",
        icon: <Sparkles size={16} />,
        disabled: theme === "scenic",
        onSelect: () => setTheme("scenic"),
      },
      {
        id: "theme-dark",
        label: "Theme: Aero Dark",
        group: "Appearance",
        icon: <Moon size={16} />,
        disabled: theme === "dark",
        onSelect: () => setTheme("dark"),
      },
      {
        id: "theme-accessible",
        label: "Theme: Accessible",
        group: "Appearance",
        icon: <Contrast size={16} />,
        keywords: ["contrast"],
        disabled: theme === "accessible",
        onSelect: () => setTheme("accessible"),
      },
      {
        id: "density",
        label: density === "compact" ? "Use comfortable density" : "Use compact density",
        group: "Appearance",
        icon: <Rows3 size={16} />,
        onSelect: () => setDensity(density === "compact" ? "comfortable" : "compact"),
      },
      {
        id: "reset",
        label: "Reset demo data",
        group: "Actions",
        icon: <RotateCcw size={16} />,
        onSelect: () => {
          dispatch({ type: "reset" });
          toast({ title: "Demo data reset", tone: "success" });
        },
      },
      ...issues.map<CommandItem>((i) => ({
        id: `issue-${i.id}`,
        label: `${i.key} ${i.title}`,
        group: "Issues",
        icon: <IssueTypeIcon type={i.type} />,
        onSelect: () => openIssue(i.key),
      })),
    ],
    [
      issues,
      theme,
      density,
      setTheme,
      setDensity,
      dispatch,
      goTo,
      openIssue,
      openCreate,
      showShortcuts,
    ],
  );

  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      commands={commands}
      placeholder="Search issues or run a command…"
    />
  );
});
