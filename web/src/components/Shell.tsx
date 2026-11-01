import {
  Activity,
  Code2,
  Globe,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings2,
  ShieldCheck,
  Target,
  UserRound,
} from "@orbit/icons";
import {
  AeroBackground,
  AeroButton,
  AeroHeader,
  AeroSidebar,
  AppShell,
  Avatar,
  CommandPalette,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  HeaderSearch,
  ProjectSwitcher,
  SidebarItem,
  SidebarSection,
  Tooltip,
  useHotkey,
  type CommandItem,
  type ProjectSummary,
} from "@orbit/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { SiteView } from "../App";
import { api, type Site } from "../lib/api";
import { compact as fmtCompact } from "../lib/format";
import { useRealtime } from "../lib/queries";
import { Link, navigate, onLinkClick } from "../lib/router";
import { Brand } from "./Brand";

export function siteKey(s: Site): string {
  const base = s.name.replace(/[^\p{L}\p{N} ]/gu, " ").trim() || s.domain;
  const words = base.split(/\s+/);
  return (words.length > 1 ? words[0]![0]! + words[1]![0]! : base.slice(0, 2)).toUpperCase();
}

export function toProject(s: Site): ProjectSummary {
  return { id: String(s.id), name: s.name, key: siteKey(s), color: s.color, description: s.domain };
}

const siteNav: { view: SiteView; label: string; icon: ReactNode; path: string }[] = [
  { view: "overview", label: "Overview", icon: <LayoutDashboard size={18} />, path: "" },
  { view: "live", label: "Live", icon: <Activity size={18} />, path: "/live" },
  { view: "goals", label: "Goals & events", icon: <Target size={18} />, path: "/goals" },
];
const setupNav: typeof siteNav = [
  { view: "install", label: "Tracking code", icon: <Code2 size={18} />, path: "/install" },
  { view: "settings", label: "Site settings", icon: <Settings2 size={18} />, path: "/settings" },
];

interface ShellProps {
  sites: Site[];
  site: Site | undefined;
  view: SiteView | null;
  pathname: string;
  email: string;
  children: ReactNode;
}

export function Shell({ sites, site, view, pathname, email, children }: ShellProps) {
  const [drawer, setDrawer] = useState(false);
  const [compact, setCompact] = useState(false);
  const [palette, setPalette] = useState(false);
  const lastSite = useRef<Site | undefined>(undefined);
  if (site) lastSite.current = site;
  // Keep site navigation meaningful on account/privacy pages.
  const navSite = site ?? (lastSite.current && sites.find((s) => s.id === lastSite.current!.id)) ?? sites[0];

  useHotkey("mod+k", () => setPalette((o) => !o), { allowInInputs: true });
  useHotkey("[", () => setCompact((c) => !c));

  const go = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => onLinkClick(e, href);

  const sidebar = (
    <AeroSidebar
      compact={compact}
      onCompactChange={setCompact}
      label="Main navigation"
      header={
        navSite ? (
          <ProjectSwitcher
            compact={compact}
            projects={sites.map(toProject)}
            value={String(navSite.id)}
            onValueChange={(id) => {
              setDrawer(false);
              navigate(`/sites/${id}${view && view !== "overview" ? `/${view}` : ""}`);
            }}
            onCreateProject={() => {
              setDrawer(false);
              navigate("/new");
            }}
          />
        ) : (
          <div className="px-2 py-1.5">
            <Brand />
          </div>
        )
      }
      footer={
        <>
          <SidebarItem href="/privacy" onClick={go("/privacy")} icon={<ShieldCheck size={18} />} active={pathname === "/privacy"}>
            Privacy & data
          </SidebarItem>
          <SidebarItem href="/account" onClick={go("/account")} icon={<UserRound size={18} />} active={pathname === "/account"}>
            Account
          </SidebarItem>
        </>
      }
    >
      {navSite ? (
        <>
          <SidebarSection title="Analytics">
            {siteNav.map((n) => {
              const href = `/sites/${navSite.id}${n.path}`;
              return (
                <SidebarItem
                  key={n.view}
                  href={href}
                  onClick={go(href)}
                  icon={n.icon}
                  active={!!site && view === n.view}
                  badge={n.view === "live" ? <LiveBadge siteId={navSite.id} /> : undefined}
                >
                  {n.label}
                </SidebarItem>
              );
            })}
          </SidebarSection>
          <SidebarSection title="Setup">
            {setupNav.map((n) => {
              const href = `/sites/${navSite.id}${n.path}`;
              return (
                <SidebarItem key={n.view} href={href} onClick={go(href)} icon={n.icon} active={!!site && view === n.view}>
                  {n.label}
                </SidebarItem>
              );
            })}
          </SidebarSection>
          {sites.length > 1 && (
            <SidebarSection title="Websites" collapsible defaultOpen={sites.length <= 6}>
              {sites.map((s) => {
                const href = `/sites/${s.id}`;
                return (
                  <SidebarItem
                    key={s.id}
                    href={href}
                    onClick={go(href)}
                    icon={
                      <span
                        className="orb-project-icon"
                        style={{ width: 18, height: 18, fontSize: 8, borderRadius: 5, ["--orb-project-color" as string]: s.color }}
                      >
                        {siteKey(s).slice(0, 1)}
                      </span>
                    }
                    active={site?.id === s.id && view === "overview"}
                  >
                    {s.name}
                  </SidebarItem>
                );
              })}
            </SidebarSection>
          )}
        </>
      ) : (
        <SidebarSection title="Get started">
          <SidebarItem href="/new" onClick={go("/new")} icon={<Globe size={18} />} active={pathname === "/new"}>
            Add a website
          </SidebarItem>
        </SidebarSection>
      )}
    </AeroSidebar>
  );

  const header = (
    <AeroHeader
      onMenuClick={() => setDrawer(true)}
      logo={
        <Link href="/" aria-label="Trustworthy home" className="tw-brand">
          <Brand />
        </Link>
      }
      search={<HeaderSearch placeholder="Jump to a site or view…" onClick={() => setPalette(true)} />}
      actions={
        <>
          {navSite && <LivePill site={navSite} />}
          <AeroButton leadingIcon={<Plus size={16} />} onClick={() => navigate("/new")} className="max-sm:!px-2.5">
            <span className="max-sm:sr-only">Add website</span>
          </AeroButton>
          <AccountMenu email={email} />
        </>
      }
    />
  );

  return (
    <>
      <AppShell
        background={<AeroBackground />}
        sidebar={sidebar}
        header={header}
        sidebarOpen={drawer}
        onSidebarOpenChange={setDrawer}
      >
        {children}
      </AppShell>
      <Palette open={palette} onOpenChange={setPalette} sites={sites} site={navSite} />
    </>
  );
}

function LiveBadge({ siteId }: { siteId: number }) {
  const rt = useRealtime(siteId, 30_000);
  const n = rt.data?.pageviewsLast5 ?? 0;
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tw-live-dot" aria-hidden />
      <span className="tabular">{fmtCompact(n)}</span>
      <span className="orb-sr-only"> pageviews in the last 5 minutes</span>
    </span>
  );
}

function LivePill({ site }: { site: Site }) {
  const rt = useRealtime(site.id, 15_000);
  const n = rt.data?.pageviewsLast5 ?? 0;
  const href = `/sites/${site.id}/live`;
  return (
    <Tooltip content={`${n.toLocaleString()} pageviews on ${site.domain} in the last 5 minutes`}>
      <Link href={href} className="tw-live-pill max-md:!hidden" aria-label={`Live: ${n} pageviews in the last 5 minutes`}>
        <span className="tw-live-dot" data-idle={n === 0 ? "" : undefined} aria-hidden />
        <span className="tabular font-medium">{fmtCompact(n)}</span>
        <span className="text-fg-muted">in 5 min</span>
      </Link>
    </Tooltip>
  );
}

function AccountMenu({ email }: { email: string }) {
  const qc = useQueryClient();
  const signOut = async () => {
    await api.post("/api/logout").catch(() => undefined);
    qc.clear();
    navigate("/", { replace: true });
    await qc.invalidateQueries();
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-full focus-visible:outline-none" aria-label="Account menu">
          <Avatar name={email || "Owner"} size="sm" decorative />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuLabel>{email}</DropdownMenuLabel>
        <DropdownMenuItem icon={<UserRound size={16} />} onSelect={() => navigate("/account")}>
          Account
        </DropdownMenuItem>
        <DropdownMenuItem icon={<ShieldCheck size={16} />} onSelect={() => navigate("/privacy")}>
          Privacy & data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<LogOut size={16} />} onSelect={() => void signOut()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Palette({
  open,
  onOpenChange,
  sites,
  site,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sites: Site[];
  site: Site | undefined;
}) {
  const commands = useMemo<CommandItem[]>(() => {
    const out: CommandItem[] = [];
    if (site) {
      for (const n of [...siteNav, ...setupNav]) {
        out.push({
          id: `nav-${n.view}`,
          label: n.label,
          description: site.name,
          group: "Go to",
          icon: n.icon,
          onSelect: () => navigate(`/sites/${site.id}${n.path}`),
        });
      }
    }
    for (const s of sites) {
      out.push({
        id: `site-${s.id}`,
        label: s.name,
        description: s.domain,
        group: "Websites",
        keywords: [s.domain],
        icon: <Globe size={16} />,
        onSelect: () => navigate(`/sites/${s.id}`),
      });
    }
    out.push(
      { id: "add", label: "Add a website", group: "Actions", icon: <Plus size={16} />, onSelect: () => navigate("/new") },
      { id: "privacy", label: "Privacy & data", group: "Actions", icon: <ShieldCheck size={16} />, onSelect: () => navigate("/privacy") },
      { id: "account", label: "Account settings", group: "Actions", icon: <UserRound size={16} />, onSelect: () => navigate("/account") },
    );
    return out;
  }, [sites, site]);
  return <CommandPalette open={open} onOpenChange={onOpenChange} commands={commands} placeholder="Jump to a site or view…" />;
}
