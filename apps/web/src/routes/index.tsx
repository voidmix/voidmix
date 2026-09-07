import { createFileRoute } from "@tanstack/react-router";

import { CleanHome } from "../features/home/clean-home";

export const Route = createFileRoute("/")({ component: CleanHome });
