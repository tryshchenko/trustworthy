import {
  AssigneeSelector,
  PrioritySelector,
  ProjectSwitcher,
  StatusSelector,
  type IssuePriority,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { people, projects, statuses } from "./fixtures";

const meta: Meta = { title: "Product/Selectors", tags: ["autodocs"] };
export default meta;

function All() {
  const [status, setStatus] = useState("in-progress");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [project, setProject] = useState("plat");
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 300 }}>
      <StatusSelector value={status} onValueChange={setStatus} statuses={statuses} />
      <AssigneeSelector
        people={people}
        value={assignee}
        onValueChange={setAssignee}
        currentUserId="priya"
      />
      <PrioritySelector value={priority} onValueChange={setPriority} />
      <div className="orb-card orb-card--solid orb-pad-sm">
        <ProjectSwitcher
          projects={projects}
          value={project}
          onValueChange={setProject}
          onCreateProject={() => {}}
        />
      </div>
    </div>
  );
}

export const Selectors: StoryObj = {
  render: () => <All />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Assignee" }));
    const search = await c.findByRole("combobox", { name: "Assignee" });
    await userEvent.type(search, "me");
    await userEvent.keyboard("{Enter}");
    await expect(c.getByRole("button", { name: "Assignee" })).toHaveTextContent("Priya Raman");
  },
};
