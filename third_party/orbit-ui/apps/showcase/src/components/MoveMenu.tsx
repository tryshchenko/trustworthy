import { ArrowDownToLine, ArrowUpToLine, MoreHorizontal } from "@orbit/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
} from "@orbit/ui";
import { statuses, type Issue, type StatusId } from "../data/mock";

interface Props {
  issue: Issue;
  onMove: (status: StatusId, position: "top" | "bottom") => void;
}

/** Non-drag alternative for moving cards (WCAG 2.5.7 Dragging Movements). */
export function MoveMenu({ issue, onMove }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          size="sm"
          variant="ghost"
          label={`Actions for ${issue.key}`}
          tooltip={false}
          icon={<MoreHorizontal size={16} />}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={issue.status}
          onValueChange={(v) => onMove(v as StatusId, "top")}
        >
          {statuses.map((s) => (
            <DropdownMenuRadioItem key={s.value} value={s.value}>
              {s.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          icon={<ArrowUpToLine size={15} />}
          onSelect={() => onMove(issue.status, "top")}
        >
          Move to top of column
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<ArrowDownToLine size={15} />}
          onSelect={() => onMove(issue.status, "bottom")}
        >
          Move to bottom of column
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
