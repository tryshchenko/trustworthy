import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  IssueEditor,
  toast,
  type IssueDraft,
} from "@orbit/ui";
import { labels, people, statuses } from "../data/mock";
import { useIssues } from "../state/store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: Partial<IssueDraft>;
  onCreated: (key: string) => void;
}

export function CreateIssueDialog({ open, onOpenChange, defaults, onCreated }: Props) {
  const { createIssue } = useIssues();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create issue</DialogTitle>
          <DialogDescription>
            New issues are added to the top of their column in the active sprint.
          </DialogDescription>
        </DialogHeader>
        <IssueEditor
          people={people}
          statuses={statuses}
          labels={labels}
          defaultValue={defaults}
          onCancel={() => onOpenChange(false)}
          onSubmit={(draft) => {
            const { key } = createIssue(draft);
            onOpenChange(false);
            toast({
              title: `${key} created`,
              description: draft.title,
              tone: "success",
              action: { label: "View", onClick: () => onCreated(key) },
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
