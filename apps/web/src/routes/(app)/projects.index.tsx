import { createFileRoute } from "@tanstack/react-router";

import { ProjectsPage } from "../../features/projects/projects-page";

export const Route = createFileRoute("/(app)/projects/")({ component: ProjectsPage });
