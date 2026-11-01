import { Compass } from "@orbit/icons";
import { Button, EmptyState } from "@orbit/ui";
import { navigate } from "../lib/router";

export function NotFound() {
  return (
    <div className="grid flex-1 place-items-center">
      <EmptyState
        icon={<Compass size={28} />}
        title="Nothing here"
        description="This page doesn't exist, or the website was removed."
        actions={<Button onClick={() => navigate("/")}>Back to dashboard</Button>}
      />
    </div>
  );
}
