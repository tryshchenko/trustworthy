import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../foundation/Button";
import { Combobox } from "../foundation/Combobox";
import { DatePicker } from "../foundation/DatePicker";
import { Field, Input, Select, Textarea, useFieldControl } from "../foundation/Form";
import { IssueTypeIcon } from "./Indicators";
import { AssigneeSelector, PrioritySelector, StatusSelector } from "./Selectors";
import {
  defaultStatuses,
  issueTypeLabels,
  type IssuePriority,
  type IssueType,
  type LabelDefinition,
  type Person,
  type StatusDefinition,
} from "./types";

export interface IssueDraft {
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  status: string;
  assigneeId: string | null;
  labels: string[];
  dueDate: string | null;
  estimate: number | null;
}

export interface IssueEditorProps {
  defaultValue?: Partial<IssueDraft>;
  people: Person[];
  statuses?: StatusDefinition[];
  labels?: LabelDefinition[];
  issueTypes?: IssueType[];
  onSubmit: (draft: IssueDraft) => void;
  onCancel?: () => void;
  submitLabel?: string;
  /** Extra actions in the footer (left side). */
  footerStart?: ReactNode;
  className?: string;
  /** Render the footer buttons. Disable when the host (e.g. a Dialog) renders its own. */
  showFooter?: boolean;
  /** `id` for the <form>, so external buttons can use `form={id}`. */
  id?: string;
}

type Errors = Partial<Record<keyof IssueDraft, string>>;

export function validateIssueDraft(d: IssueDraft): Errors {
  const errors: Errors = {};
  if (!d.title.trim()) errors.title = "Enter a summary for the issue.";
  else if (d.title.length > 255) errors.title = "Keep the summary under 255 characters.";
  if (d.estimate != null && (Number.isNaN(d.estimate) || d.estimate < 0 || d.estimate > 100))
    errors.estimate = "Estimate must be a number between 0 and 100.";
  return errors;
}

/** Create/edit form for an issue with accessible validation. */
export function IssueEditor({
  defaultValue,
  people,
  statuses = defaultStatuses,
  labels = [],
  issueTypes = ["story", "task", "bug", "epic"],
  onSubmit,
  onCancel,
  submitLabel = "Create issue",
  footerStart,
  className,
  showFooter = true,
  id,
}: IssueEditorProps) {
  const genId = useId();
  const formId = id ?? `orb-issue-editor-${genId}`;
  const [draft, setDraft] = useState<IssueDraft>({
    title: "",
    description: "",
    type: "task",
    priority: "medium",
    status: statuses[0]?.value ?? "todo",
    assigneeId: null,
    labels: [],
    dueDate: null,
    estimate: null,
    ...defaultValue,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof IssueDraft>(key: K, value: IssueDraft[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (submitted) setErrors(validateIssueDraft(next));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validateIssueDraft(draft);
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (errs.title) titleRef.current?.focus();
      return;
    }
    onSubmit({ ...draft, title: draft.title.trim() });
  };

  return (
    <form id={formId} className={cn("orb-issue-editor", className)} onSubmit={submit} noValidate>
      <div className="orb-issue-editor__row">
        <Field label="Issue type">
          <Select
            value={draft.type}
            onValueChange={(v) => update("type", v as IssueType)}
            options={issueTypes.map((t) => ({
              value: t,
              label: issueTypeLabels[t],
              icon: <IssueTypeIcon type={t} />,
            }))}
          />
        </Field>
        <Field label="Status">
          <StatusSelectorField
            value={draft.status}
            statuses={statuses}
            onChange={(v) => update("status", v)}
          />
        </Field>
      </div>
      <Field label="Summary" required error={errors.title}>
        <Input
          ref={titleRef}
          value={draft.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="What needs to be done?"
          maxLength={300}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </Field>
      <Field label="Description" description="Markdown is supported in the full editor.">
        <Textarea
          value={draft.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
        />
      </Field>
      <div className="orb-issue-editor__row">
        <Field label="Assignee">
          <AssigneeSelectorField
            people={people}
            value={draft.assigneeId}
            onChange={(v) => update("assigneeId", v)}
          />
        </Field>
        <Field label="Priority">
          <PrioritySelectorField value={draft.priority} onChange={(v) => update("priority", v)} />
        </Field>
      </div>
      <div className="orb-issue-editor__row">
        <Field label="Labels">
          <Combobox
            multiple
            options={labels.map((l) => ({ value: l.value, label: l.label }))}
            value={draft.labels}
            onValueChange={(v) => update("labels", v)}
            placeholder="Add labels"
            searchPlaceholder="Search labels…"
          />
        </Field>
        <Field label="Due date">
          <DatePicker
            value={draft.dueDate}
            onValueChange={(v) => update("dueDate", v)}
            clearable
            onClear={() => update("dueDate", null)}
          />
        </Field>
      </div>
      <Field
        label="Estimate"
        description="Story points, 0–100."
        error={errors.estimate}
        className="orb-issue-editor__estimate"
      >
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={draft.estimate ?? ""}
          onChange={(e) =>
            update("estimate", e.target.value === "" ? null : Number(e.target.value))
          }
        />
      </Field>
      {showFooter && (
        <div className="orb-issue-editor__footer">
          <div>{footerStart}</div>
          <div className="orb-inline">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button variant="aero" type="submit">
              {submitLabel}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

/* Field-aware wrappers: pass the Field's generated id to selectors so the <label> targets them. */

function StatusSelectorField(props: {
  value: string;
  statuses: StatusDefinition[];
  onChange: (v: string) => void;
}) {
  const { id } = useFieldControl({});
  return (
    <StatusSelector
      id={id}
      value={props.value}
      statuses={props.statuses}
      onValueChange={props.onChange}
    />
  );
}
function AssigneeSelectorField(props: {
  people: Person[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const { id } = useFieldControl({});
  return (
    <AssigneeSelector
      id={id}
      people={props.people}
      value={props.value}
      onValueChange={props.onChange}
    />
  );
}
function PrioritySelectorField(props: {
  value: IssuePriority;
  onChange: (v: IssuePriority) => void;
}) {
  const { id } = useFieldControl({});
  return <PrioritySelector id={id} value={props.value} onValueChange={props.onChange} />;
}
