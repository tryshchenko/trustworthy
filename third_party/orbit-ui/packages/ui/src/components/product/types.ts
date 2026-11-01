import type { Tone } from "@orbit/tokens";
import type { StatusShape } from "../aero/StatusPill";

/**
 * Presentation-level types shared by the product components. They describe what
 * a component needs to *render* — never workflow rules. Your app owns the
 * domain model and maps it onto these shapes.
 */

export type IssueType = "story" | "bug" | "task" | "epic" | "subtask";
export type IssuePriority = "highest" | "high" | "medium" | "low" | "lowest";

export interface Person {
  id: string;
  name: string;
  avatarUrl?: string;
  /** Secondary line, e.g. role or email. */
  detail?: string;
}

/** Describes how a workflow status looks. Your app decides which statuses exist. */
export interface StatusDefinition {
  value: string;
  label: string;
  tone: Tone;
  shape: StatusShape;
}

export interface LabelDefinition {
  value: string;
  label: string;
  /** Tone name or any CSS colour. */
  color?: Tone | (string & {});
}

/** A sensible default workflow, used when you don't provide your own. */
export const defaultStatuses: StatusDefinition[] = [
  { value: "todo", label: "To do", tone: "neutral", shape: "todo" },
  { value: "in-progress", label: "In progress", tone: "info", shape: "progress" },
  { value: "in-review", label: "In review", tone: "discovery", shape: "review" },
  { value: "done", label: "Done", tone: "success", shape: "done" },
];

export function findStatus(
  statuses: StatusDefinition[],
  value: string | undefined,
): StatusDefinition | undefined {
  return statuses.find((s) => s.value === value);
}

export const priorityOrder: IssuePriority[] = ["highest", "high", "medium", "low", "lowest"];
export const priorityLabels: Record<IssuePriority, string> = {
  highest: "Highest",
  high: "High",
  medium: "Medium",
  low: "Low",
  lowest: "Lowest",
};
export const issueTypeLabels: Record<IssueType, string> = {
  story: "Story",
  bug: "Bug",
  task: "Task",
  epic: "Epic",
  subtask: "Sub-task",
};
