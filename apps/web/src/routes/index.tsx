import { createFileRoute } from "@tanstack/react-router";
import { PublicHome } from "../features/marketing/public-home";

export const Route = createFileRoute("/")({ component: PublicHome });
