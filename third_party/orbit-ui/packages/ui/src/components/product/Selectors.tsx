import { Check, ChevronDown, ChevronsUpDown, Plus, UserRound } from "@orbit/icons";
import { Select as RS } from "radix-ui";
import { forwardRef, useMemo, type ReactNode } from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";
import { StatusGlyph, StatusPill } from "../aero/StatusPill";
import { Combobox, type ListOption } from "../foundation/Combobox";
import { Avatar } from "../foundation/Display";
import { PriorityIndicator } from "./Indicators";
import {
  defaultStatuses,
  priorityLabels,
  priorityOrder,
  type IssuePriority,
  type Person,
  type StatusDefinition,
} from "./types";

/* ======================================================= AssigneeSelector */

export interface AssigneeSelectorProps {
  people: Person[];
  value: string | null;
  onValueChange: (personId: string | null) => void;
  /** Allow choosing "Unassigned". Default true. */
  allowUnassigned?: boolean;
  /** Pinned "Assign to me" shortcut. */
  currentUserId?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  appearance?: "default" | "ghost";
  "aria-label"?: string;
  id?: string;
  className?: string;
}

const UNASSIGNED = "__unassigned__";

/** Searchable people picker with avatars. */
export const AssigneeSelector = forwardRef<HTMLButtonElement, AssigneeSelectorProps>(
  function AssigneeSelector(
    {
      people,
      value,
      onValueChange,
      allowUnassigned = true,
      currentUserId,
      appearance = "default",
      "aria-label": ariaLabel = "Assignee",
      ...rest
    },
    ref,
  ) {
    const options = useMemo<ListOption[]>(() => {
      const opts: ListOption[] = people.map((p) => ({
        value: p.id,
        label: p.id === currentUserId ? `${p.name} (you)` : p.name,
        description: p.detail,
        keywords: p.id === currentUserId ? ["me"] : undefined,
        icon: <Avatar name={p.name} src={p.avatarUrl} size="xs" decorative />,
      }));
      if (currentUserId) opts.sort((a) => (a.value === currentUserId ? -1 : 0));
      if (allowUnassigned) {
        opts.unshift({
          value: UNASSIGNED,
          label: "Unassigned",
          icon: <span className="orb-avatar orb-avatar--xs orb-avatar--empty" />,
        });
      }
      return opts;
    }, [people, allowUnassigned, currentUserId]);

    const person = people.find((p) => p.id === value);
    return (
      <Combobox
        ref={ref}
        {...rest}
        aria-label={ariaLabel}
        appearance={appearance}
        options={options}
        value={value ?? UNASSIGNED}
        onValueChange={(v) => onValueChange(v === UNASSIGNED || v == null ? null : v)}
        searchPlaceholder="Search people…"
        emptyMessage="No matching people"
        renderValue={() =>
          person ? (
            <span className="orb-inline">
              <Avatar name={person.name} src={person.avatarUrl} size="xs" decorative />
              {person.name}
            </span>
          ) : (
            <span className="orb-inline orb-text-secondary">
              <UserRound size={15} aria-hidden />
              Unassigned
            </span>
          )
        }
      />
    );
  },
);

/* ========================================================= StatusSelector */

export interface StatusSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  statuses?: StatusDefinition[];
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
  className?: string;
  size?: "sm" | "md";
}

/** Workflow status picker whose trigger is a StatusPill. */
export const StatusSelector = forwardRef<HTMLButtonElement, StatusSelectorProps>(
  function StatusSelector(
    {
      value,
      onValueChange,
      statuses = defaultStatuses,
      disabled,
      "aria-label": ariaLabel = "Status",
      id,
      className,
      size = "md",
    },
    ref,
  ) {
    const container = usePortalContainer();
    const current = statuses.find((s) => s.value === value);
    return (
      <RS.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RS.Trigger
          ref={ref}
          id={id}
          aria-label={ariaLabel}
          className={cn("orb-status-trigger", className)}
        >
          {current ? (
            <StatusPill tone={current.tone} shape={current.shape} size={size}>
              <RS.Value>{current.label}</RS.Value>
              <ChevronDown size={13} aria-hidden className="orb-status-trigger__chevron" />
            </StatusPill>
          ) : (
            <RS.Value placeholder="Set status" />
          )}
        </RS.Trigger>
        <RS.Portal container={container}>
          <RS.Content
            className="orb-menu orb-select__content"
            position="popper"
            sideOffset={6}
            collisionPadding={8}
          >
            <RS.Viewport>
              {statuses.map((s) => (
                <RS.Item
                  key={s.value}
                  value={s.value}
                  textValue={s.label}
                  className="orb-menu__item orb-menu__item--check"
                >
                  <span className="orb-menu__indicator" aria-hidden>
                    <RS.ItemIndicator>
                      <Check size={12} strokeWidth={2.5} />
                    </RS.ItemIndicator>
                  </span>
                  <span
                    className={cn("orb-menu__icon", `orb-tone-${s.tone}`, "orb-tone-text")}
                    aria-hidden
                  >
                    <StatusGlyph shape={s.shape} />
                  </span>
                  <RS.ItemText>{s.label}</RS.ItemText>
                </RS.Item>
              ))}
            </RS.Viewport>
          </RS.Content>
        </RS.Portal>
      </RS.Root>
    );
  },
);

/* ======================================================= PrioritySelector */

export interface PrioritySelectorProps {
  value: IssuePriority;
  onValueChange: (value: IssuePriority) => void;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
  appearance?: "default" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const PrioritySelector = forwardRef<HTMLButtonElement, PrioritySelectorProps>(
  function PrioritySelector(
    {
      value,
      onValueChange,
      disabled,
      "aria-label": ariaLabel = "Priority",
      id,
      appearance = "default",
      size = "md",
    },
    ref,
  ) {
    const container = usePortalContainer();
    return (
      <RS.Root
        value={value}
        onValueChange={(v) => onValueChange(v as IssuePriority)}
        disabled={disabled}
      >
        <RS.Trigger
          ref={ref}
          id={id}
          aria-label={ariaLabel}
          className={cn(
            "orb-select",
            `orb-input--${size}`,
            appearance === "ghost" && "orb-select--ghost",
          )}
        >
          <span className="orb-inline">
            <PriorityIndicator
              priority={value}
              aria-hidden
              role={undefined}
              aria-label={undefined}
            />
            <RS.Value />
          </span>
          <ChevronDown size={14} aria-hidden className="orb-select__icon" />
        </RS.Trigger>
        <RS.Portal container={container}>
          <RS.Content
            className="orb-menu orb-select__content"
            position="popper"
            sideOffset={6}
            collisionPadding={8}
          >
            <RS.Viewport>
              {priorityOrder.map((p) => (
                <RS.Item
                  key={p}
                  value={p}
                  textValue={priorityLabels[p]}
                  className="orb-menu__item orb-menu__item--check"
                >
                  <span className="orb-menu__indicator" aria-hidden>
                    <RS.ItemIndicator>
                      <Check size={12} strokeWidth={2.5} />
                    </RS.ItemIndicator>
                  </span>
                  <span className="orb-menu__icon" aria-hidden>
                    <PriorityIndicator priority={p} role={undefined} aria-label={undefined} />
                  </span>
                  <RS.ItemText>{priorityLabels[p]}</RS.ItemText>
                </RS.Item>
              ))}
            </RS.Viewport>
          </RS.Content>
        </RS.Portal>
      </RS.Root>
    );
  },
);

/* ========================================================= ProjectSwitcher */

export interface ProjectSummary {
  id: string;
  name: string;
  /** Short key, e.g. "PLAT". */
  key: string;
  /** Avatar/icon node; defaults to a coloured key badge. */
  icon?: ReactNode;
  color?: string;
  description?: string;
}

export interface ProjectSwitcherProps {
  projects: ProjectSummary[];
  value: string;
  onValueChange: (projectId: string) => void;
  /** Adds a "Create project" action in the list footer. */
  onCreateProject?: () => void;
  /** Compact (icon-only) trigger, e.g. in a collapsed sidebar. */
  compact?: boolean;
  className?: string;
}

export function ProjectIcon({ project, size = 28 }: { project: ProjectSummary; size?: number }) {
  return (
    <span
      className="orb-project-icon"
      style={{
        width: size,
        height: size,
        ["--orb-project-color" as string]: project.color ?? "#086BEE",
      }}
      aria-hidden
    >
      {project.icon ?? project.key.slice(0, 2)}
    </span>
  );
}

/** Searchable project picker for sidebars and headers. */
export function ProjectSwitcher({
  projects,
  value,
  onValueChange,
  onCreateProject,
  compact,
  className,
}: ProjectSwitcherProps) {
  const current = projects.find((p) => p.id === value) ?? projects[0];
  const options = projects.map<ListOption>((p) => ({
    value: p.id,
    label: p.name,
    description: p.key,
    keywords: [p.key],
    icon: <ProjectIcon project={p} size={22} />,
  }));
  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={(v) => v && onValueChange(v)}
      aria-label={`Switch project (current: ${current?.name ?? "none"})`}
      searchPlaceholder="Find a project…"
      trigger={
        <button
          type="button"
          className={cn(
            "orb-project-switcher",
            compact && "orb-project-switcher--compact",
            className,
          )}
        >
          {current && <ProjectIcon project={current} />}
          {!compact && current && (
            <span className="orb-project-switcher__text">
              <span className="orb-project-switcher__name">{current.name}</span>
              <span className="orb-project-switcher__meta">{current.description ?? "Software project"}</span>
            </span>
          )}
          {!compact && (
            <ChevronsUpDown size={15} aria-hidden className="orb-project-switcher__chevron" />
          )}
          <span className="orb-sr-only">Switch project</span>
        </button>
      }
      footer={
        onCreateProject && (
          <button
            type="button"
            className="orb-menu__item orb-searchlist__action"
            onClick={onCreateProject}
          >
            <span className="orb-menu__icon" aria-hidden>
              <Plus size={15} />
            </span>
            Create project
          </button>
        )
      }
    />
  );
}
