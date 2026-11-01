import { Construction } from "@orbit/icons";
import { Badge, Button, EmptyState, GlassPanel } from "@orbit/ui";

/** Honest placeholder for views intentionally left out of the demo. */
export function UnavailableView({ name, onGoToBoard }: { name: string; onGoToBoard: () => void }) {
  return (
    <GlassPanel variant="subtle" className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={<Construction size={24} />}
        title={
          <span className="inline-flex items-center gap-2">
            {name} <Badge variant="warning">Not in demo</Badge>
          </span>
        }
        description={`The ${name.toLowerCase()} view is intentionally not implemented in this showcase. The board, issues list, overview and settings are fully interactive.`}
        actions={
          <Button variant="aero" onClick={onGoToBoard}>
            Go to the board
          </Button>
        }
      />
    </GlassPanel>
  );
}
