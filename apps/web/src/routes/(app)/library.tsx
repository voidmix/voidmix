import { createFileRoute } from "@tanstack/react-router";

import { LibraryPage } from "../../features/projects/components/library-page";

export const Route = createFileRoute("/(app)/library")({ component: LibraryPage });
