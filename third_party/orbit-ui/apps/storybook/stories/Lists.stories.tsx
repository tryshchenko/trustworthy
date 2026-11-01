import {
  Avatar,
  BacklogList,
  DataGrid,
  StatusPill,
  defaultStatuses,
  type DataGridColumn,
} from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { manyBacklogItems, people } from "./fixtures";

const meta: Meta = {
  title: "Product/Lists & grids",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Both components virtualise rows (TanStack Virtual), so 5,000 rows render only what is visible.",
      },
    },
  },
};
export default meta;

function Backlog({ n }: { n: number }) {
  const items = useMemo(() => manyBacklogItems(n), [n]);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <BacklogList
      label="Backlog"
      items={items}
      height={520}
      selectedId={selected}
      onOpen={(i) => setSelected(i.id)}
    />
  );
}

export const BacklogListStory: StoryObj = {
  name: "BacklogList (5,000 rows)",
  render: () => <Backlog n={5000} />,
};

interface Row {
  id: string;
  key: string;
  title: string;
  assignee: string;
  status: string;
  points: number;
}

const rows: Row[] = manyBacklogItems(1200).map((i) => ({
  id: i.id,
  key: i.issueKey,
  title: i.title,
  assignee: i.assignee?.name ?? "Unassigned",
  status: i.status,
  points: i.estimate ?? 0,
}));

const columns: DataGridColumn<Row>[] = [
  { id: "key", header: "Key", width: 110, cell: (r) => r.key, sortValue: (r) => r.key },
  {
    id: "title",
    header: "Summary",
    isRowHeader: true,
    cell: (r) => r.title,
    sortValue: (r) => r.title,
  },
  {
    id: "assignee",
    header: "Assignee",
    width: 200,
    sortValue: (r) => r.assignee,
    cell: (r) => (
      <span className="orb-inline">
        <Avatar name={r.assignee} size="xs" decorative /> {r.assignee}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: 150,
    sortValue: (r) => r.status,
    cell: (r) => {
      const s = defaultStatuses.find((x) => x.value === r.status)!;
      return (
        <StatusPill size="sm" tone={s.tone} shape={s.shape}>
          {s.label}
        </StatusPill>
      );
    },
  },
  {
    id: "points",
    header: "Points",
    width: 90,
    align: "end",
    cell: (r) => r.points,
    sortValue: (r) => r.points,
  },
];

export const DataGridStory: StoryObj = {
  name: "DataGrid (1,200 rows)",
  render: () => (
    <DataGrid
      label="All issues"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      onRowActivate={() => {}}
      height={520}
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const header = c.getByRole("columnheader", { name: /Points/ });
    await userEvent.click(within(header).getByRole("button"));
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(within(header).getByRole("button"));
    await expect(header).toHaveAttribute("aria-sort", "descending");
  },
};

export const SmallGrid: StoryObj = {
  render: () => (
    <DataGrid
      label="Team"
      columns={[
        {
          id: "name",
          header: "Name",
          isRowHeader: true,
          cell: (p: (typeof people)[number]) => p.name,
          sortValue: (p) => p.name,
        },
        { id: "role", header: "Role", cell: (p) => p.detail },
      ]}
      rows={people}
      getRowId={(p) => p.id}
      height={360}
    />
  ),
};
