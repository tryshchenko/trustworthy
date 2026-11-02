import { useEffect } from "react";
import { Shell } from "./components/Shell";
import { matchPath, navigate, useLocation } from "./lib/router";
import { useSession, useSites } from "./lib/queries";
import { AccountPage } from "./pages/AccountPage";
import { AuthPage } from "./pages/AuthPage";
import { GoalsPage } from "./pages/GoalsPage";
import { InstallPage } from "./pages/InstallPage";
import { LivePage } from "./pages/LivePage";
import { NewSitePage } from "./pages/NewSitePage";
import { NotFound } from "./pages/NotFound";
import { OverviewPage } from "./pages/OverviewPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { SiteSettingsPage } from "./pages/SiteSettingsPage";
import { Dial, Toaster } from "./ui";

export type SiteView = "overview" | "live" | "goals" | "install" | "settings";
const views = new Set<SiteView>(["overview", "live", "goals", "install", "settings"]);

function Loading() {
  return (
    <div className="fullscreen">
      <Dial large label="Loading Trustworthy" />
    </div>
  );
}

export function App() {
  const session = useSession();
  if (session.isPending) return <Loading />;
  if (session.isError || !session.data) return <AuthPage mode="error" error={session.error?.message} />;
  if (session.data.setupRequired) return <AuthPage mode="setup" />;
  if (!session.data.authenticated) return <AuthPage mode="login" />;
  return (
    <>
      <AuthedApp email={session.data.email ?? ""} baseUrl={session.data.baseUrl} version={session.data.version} />
      <Toaster />
    </>
  );
}

function AuthedApp({ email, baseUrl, version }: { email: string; baseUrl?: string; version: string }) {
  const { pathname } = useLocation();
  const sites = useSites();
  const list = sites.data ?? [];

  const m = matchPath("/sites/:id", pathname) ?? matchPath("/sites/:id/:view", pathname);
  const site = m ? list.find((s) => s.id === Number(m.id)) : undefined;
  const view = (m?.view ?? "overview") as SiteView;

  // "/" goes to the first site, or onboarding when there are none.
  useEffect(() => {
    if (!sites.data || pathname !== "/") return;
    const first = sites.data[0];
    navigate(first ? `/sites/${first.id}` : "/new", { replace: true });
  }, [sites.data, pathname]);

  useEffect(() => {
    const section = site ? `${view === "overview" ? "" : `${view[0]!.toUpperCase()}${view.slice(1)} · `}${site.name}` : pathname.slice(1);
    document.title = section ? `${section} — Trustworthy` : "Trustworthy";
  }, [site, view, pathname]);

  if (sites.isPending) return <Loading />;

  let content: React.ReactNode = null;
  let siteView: SiteView | null = null;
  if (pathname === "/new") content = <NewSitePage first={list.length === 0} />;
  else if (pathname === "/account") content = <AccountPage email={email} version={version} />;
  else if (pathname === "/privacy") content = <PrivacyPage />;
  else if (site && views.has(view)) {
    siteView = view;
    content = {
      overview: <OverviewPage key={site.id} site={site} />,
      live: <LivePage site={site} />,
      goals: <GoalsPage key={site.id} site={site} />,
      install: <InstallPage site={site} baseUrl={baseUrl} />,
      settings: <SiteSettingsPage key={site.id} site={site} />,
    }[view];
  } else if (pathname !== "/") content = <NotFound />;

  return (
    <Shell sites={list} site={siteView ? site : undefined} view={siteView} pathname={pathname} email={email}>
      {content}
    </Shell>
  );
}
