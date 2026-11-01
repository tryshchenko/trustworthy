import { Share2, Star } from "@orbit/icons";
import {
  Breadcrumb,
  Button,
  IconButton,
  ProjectIcon,
  TabsList,
  TabsTrigger,
  toast,
} from "@orbit/ui";
import { projects } from "../data/mock";
import { views } from "../state/route";

export function ProjectHeader() {
  const project = projects[0]!;
  return (
    <div className="flex flex-col gap-3 px-1 pt-1">
      <Breadcrumb items={[{ label: "Projects", href: "#/overview" }, { label: project.name }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProjectIcon project={project} size={44} />
          <div className="min-w-0">
            <h1 className="orb-type-page-title m-0 truncate">{project.name}</h1>
            <p className="m-0 truncate text-sm text-fg-muted">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            label="Star project"
            icon={<Star size={17} />}
            onClick={() => toast({ title: "Starred Orbit Platform", tone: "success" })}
          />
          <Button
            variant="secondary"
            leadingIcon={<Share2 size={15} />}
            onClick={() => toast({ title: "Sharing isn't part of this demo", tone: "info" })}
          >
            Share
          </Button>
        </div>
      </div>
      <TabsList aria-label="Project views">
        {views.map((v) => (
          <TabsTrigger key={v.id} value={v.id}>
            {v.label}
            {!v.available && <span className="orb-sr-only"> (not available in demo)</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}
