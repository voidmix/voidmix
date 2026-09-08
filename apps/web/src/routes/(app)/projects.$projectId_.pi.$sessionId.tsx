import { createFileRoute } from "@tanstack/react-router";

import { PiPage } from "../../features/pi/pi-page";

export const Route = createFileRoute("/(app)/projects/$projectId_/pi/$sessionId")({
  component: PiRoute,
});

function PiRoute() {
  const params = Route.useParams();
  return <PiPage key={params.sessionId} {...params} />;
}
