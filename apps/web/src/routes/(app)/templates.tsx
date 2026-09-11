import { createFileRoute } from "@tanstack/react-router";
import { TemplatesPage } from "../../features/templates/templates-page";
export const Route = createFileRoute("/(app)/templates")({ component: TemplatesPage });
