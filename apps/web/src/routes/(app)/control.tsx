import { createFileRoute } from "@tanstack/react-router";
import { ControlPage } from "../../features/control/control-page";
export const Route = createFileRoute("/(app)/control")({ component: ControlPage });
