import { ChartLine, Copy, Robot, Stack, TextT } from "@phosphor-icons/react";
import { ProjectStudioShell } from "../projects/components/studio-shell";
import { useTranslations } from "../../i18n/client";
import { PageHeader } from "@voidmix/ui/page-header";
import { Button } from "@voidmix/ui/components/ui/button";
const catalog = [
  { key: "Pm", icon: Robot },
  { key: "Ship", icon: Stack },
  { key: "Prompt", icon: TextT },
] as const;
export function TemplatesPage() {
  const t = useTranslations("workspaceUi");
  return (
    <ProjectStudioShell current="templates" title={t("templatesTitle")}>
      <PageHeader title={t("templatesTitle")} description={t("templatesDescription")} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="template-catalog-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="template-catalog-title" className="text-lg font-semibold">
              {t("templateCatalog")}
            </h2>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {t("previewCatalog")}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {catalog.map(({ key, icon: Icon }) => (
              <article
                key={key}
                className="rounded-2xl border border-border bg-background p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <span className="text-xs text-muted-foreground">{t("templatePreviewOnly")}</span>
                </div>
                <h3 className="mt-4 font-semibold">{t(`template${key}Title`)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t(`template${key}Description`)}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  disabled
                  aria-label={t("templateUnavailable")}
                >
                  <Copy size={16} aria-hidden="true" /> {t("templateUse")}
                </Button>
              </article>
            ))}
          </div>
        </section>
        <aside
          className="rounded-2xl border border-border bg-background p-5 shadow-sm"
          aria-labelledby="usage-title"
        >
          <div className="flex items-center gap-3">
            <ChartLine size={21} className="text-primary" aria-hidden="true" />
            <h2 id="usage-title" className="font-semibold">
              {t("usageTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("usageDescription")}</p>
          <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("usageUnavailable")}
          </div>
        </aside>
      </div>
    </ProjectStudioShell>
  );
}
