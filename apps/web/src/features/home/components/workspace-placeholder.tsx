import { ArrowUpRight, Plus } from "@phosphor-icons/react";
import { useTranslations } from "@voidmix/i18n/client";
import { Badge } from "@voidmix/ui/components/ui/badge";
import { buttonVariants } from "@voidmix/ui/components/ui/button";

import { navigation, workspacePlaceholders, type WorkspaceSectionId } from "../data";

export function WorkspacePlaceholders({
  activeSection,
  launcher = false,
}: {
  activeSection?: WorkspaceSectionId;
  launcher?: boolean;
} = {}) {
  const items = activeSection
    ? workspacePlaceholders.filter((item) => item.id === activeSection)
    : workspacePlaceholders;

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <WorkspacePlaceholder key={item.id} launcher={launcher} {...item} />
      ))}
    </div>
  );
}

function WorkspacePlaceholder({
  id,
  descriptionKey,
  previewKey,
  stateKey,
  launcher = false,
}: {
  id: Exclude<WorkspaceSectionId, "overview">;
  descriptionKey: string;
  previewKey: string;
  stateKey: string;
  launcher?: boolean;
}) {
  const t = useTranslations("home");
  const navigationItem = navigation.find((item) => item.id === id);

  if (!navigationItem) return null;

  const Icon = navigationItem.icon;
  const resolvedPreviewKey = launcher && id === "projects" ? "projectsLauncherPreview" : previewKey;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-y border-border bg-card px-4 py-4 sm:px-5"
      id={id}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
            <Icon aria-hidden="true" weight="regular" />
          </span>
          <div className="min-w-0">
            <h2
              className="text-balance text-[0.95rem] font-semibold tracking-[-0.015em]"
              id={`${id}-title`}
            >
              {t(navigationItem.messageKey)}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t(descriptionKey)}
            </p>
          </div>
        </div>
        <Badge variant="secondary">{t("previewLabel")}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-input" />
          <span className="font-medium">{t(stateKey)}</span>
          <span className="truncate text-muted-foreground">{t(resolvedPreviewKey)}</span>
        </div>
        <a
          className={`${buttonVariants({ variant: "link" })} h-auto shrink-0 p-0`}
          href="#ask-voidmix"
        >
          {id === "inbox" ? <Plus data-icon="inline-start" weight="bold" /> : null}
          {t("openWorkspace")}
          <ArrowUpRight data-icon="inline-end" weight="bold" />
        </a>
      </div>
    </section>
  );
}
