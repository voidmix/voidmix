import { Button } from "@voidmix/ui/components/ui/button";
import { useTranslations } from "@voidmix/i18n/client";
import { cn } from "@voidmix/ui/lib/utils";
import { useMemo, useState } from "react";

function SettingToggle({
  label,
  description,
  initial = true,
}: {
  label: string;
  description: string;
  initial?: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <Button
        className={cn("toggle", enabled && "enabled")}
        variant="ghost"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled((value) => !value)}
      >
        <span />
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const t = useTranslations("settings");
  const sections = useMemo(
    () => [
      {
        title: t("syncBehavior"),
        settings: [
          [t("startWithSystem"), t("startWithSystemDescription"), false] as const,
          [t("meteredNetworks"), t("meteredNetworksDescription"), false] as const,
          [t("automaticDownloads"), t("automaticDownloadsDescription"), true] as const,
        ],
      },
      {
        title: t("notifications"),
        settings: [
          [t("transferSummaries"), t("transferSummariesDescription"), true] as const,
          [t("workspaceChanges"), t("workspaceChangesDescription"), true] as const,
        ],
      },
    ],
    [t],
  );

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
      </header>
      {sections.map((section) => (
        <section className="settings-section" key={section.title}>
          <h2>{section.title}</h2>
          <div className="settings-list">
            {section.settings.map(([label, description, initial]) => (
              <SettingToggle
                key={label}
                label={label}
                description={description}
                initial={initial}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
