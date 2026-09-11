import { createFileRoute } from "@tanstack/react-router";
import { CollaborationPage } from "../../features/collaboration/collaboration-page";
export const Route = createFileRoute("/(app)/collaboration")({ component: CollaborationPage });
