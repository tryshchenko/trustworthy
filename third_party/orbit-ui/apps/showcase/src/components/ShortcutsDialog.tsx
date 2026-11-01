import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, Kbd } from "@orbit/ui";

const shortcuts: [string[], string][] = [
  [["⌘", "K"], "Open command palette"],
  [["C"], "Create issue"],
  [["/"], "Search the board"],
  [["["], "Collapse or expand the sidebar"],
  [["?"], "Show keyboard shortcuts"],
  [["Esc"], "Close the inspector or dialog"],
  [["Enter"], "Open the focused issue"],
  [["Space"], "Pick up / drop the focused card"],
  [["←", "→", "↑", "↓"], "Move a picked-up card"],
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2.5">
            {shortcuts.map(([keys, label]) => (
              <div key={label} className="contents">
                <dt className="text-sm">{label}</dt>
                <dd className="m-0 flex justify-end gap-1">
                  {keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="m-0 text-xs text-fg-muted">On Windows and Linux use Ctrl instead of ⌘.</p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
