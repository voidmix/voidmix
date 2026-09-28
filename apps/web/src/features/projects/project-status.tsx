import type { ApiClient } from "@voidmix/client";
type Project = Awaited<ReturnType<ApiClient["projects"]["get"]>>["project"];
import { StatusBadge, type StatusTone } from "@voidmix/ui/status-badge";
import { BeuiBadge } from "@voidmix/ui/beui-badge";
import { useTranslations } from "../../i18n/client";

const tones = {
  draft: "neutral",
  in_progress: "info",
  review: "info",
  delivered: "success",
} as const satisfies Record<Project["stage"], StatusTone>;

export function ProjectStatus({
  stage,
  appearance,
}: {
  stage: Project["stage"];
  appearance?: "beui";
}) {
  const t = useTranslations("projects");
  const label = t(stage === "in_progress" ? "inProgress" : stage);
  if (appearance === "beui")
    return (
      <BeuiBadge tone={stage === "review" ? "warning" : tones[stage]} contentKey={stage}>
        {label}
      </BeuiBadge>
    );
  return <StatusBadge label={label} tone={tones[stage]} />;
}
