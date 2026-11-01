import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, type Breakdown, type Goal, type GoalStats, type Overview, type Realtime, type Session, type Site } from "./api";
import { apiQuery, type DashboardState } from "./period";

export const keys = {
  session: ["session"] as const,
  sites: ["sites"] as const,
  goals: (siteId: number) => ["goals", siteId] as const,
};

export function useSession() {
  return useQuery({ queryKey: keys.session, queryFn: () => api.get<Session>("/api/session"), staleTime: 60_000 });
}

export function useSites(enabled = true) {
  return useQuery({ queryKey: keys.sites, queryFn: () => api.get<Site[]>("/api/sites"), enabled, staleTime: 15_000 });
}

export function useOverview(site: Site, s: DashboardState) {
  const q = apiQuery(s);
  return useQuery({
    queryKey: ["overview", site.id, q],
    queryFn: () => api.get<Overview>(`/api/sites/${site.id}/overview?${q}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useBreakdown(site: Site, s: DashboardState, dim: string, opts: { limit?: number; search?: string; enabled?: boolean } = {}) {
  const q = apiQuery({ ...s, compare: "none" }, { dim, limit: opts.limit ?? 8, ...(opts.search ? { q: opts.search } : {}) });
  return useQuery({
    queryKey: ["breakdown", site.id, q],
    queryFn: () => api.get<Breakdown>(`/api/sites/${site.id}/breakdown?${q}`),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
    refetchInterval: 60_000,
  });
}

export function useGoals(siteId: number) {
  return useQuery({ queryKey: keys.goals(siteId), queryFn: () => api.get<Goal[]>(`/api/sites/${siteId}/goals`) });
}

export function useGoalStats(site: Site, s: DashboardState) {
  const q = apiQuery(s);
  return useQuery({
    queryKey: ["goal-stats", site.id, q],
    queryFn: () => api.get<GoalStats>(`/api/sites/${site.id}/goal-stats?${q}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useRealtime(siteId: number, intervalMs = 10_000) {
  return useQuery({
    queryKey: ["realtime", siteId],
    queryFn: () => api.get<Realtime>(`/api/sites/${siteId}/realtime`),
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
  });
}
