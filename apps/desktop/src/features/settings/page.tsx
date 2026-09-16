import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { Field, FieldLabel } from "@voidmix/ui/components/ui/field";
import { Input } from "@voidmix/ui/components/ui/input";
import { Switch } from "@voidmix/ui/components/ui/switch";
import { PageHeader } from "@voidmix/ui/page-header";
import { useDesktopTranslations } from "../../i18n/client";
import { useState } from "react";
import { useDesktopPreferences, type DesktopToggle } from "../../lib/preferences";
import { authorizeProjectFolder, type PiRuntimeStatus } from "../../lib/pi";

const sections = [
  {
    title: "syncBehavior",
    settings: [
      ["startWithSystem", "startWithSystemDescription"],
      ["meteredNetworks", "meteredNetworksDescription"],
      ["automaticDownloads", "automaticDownloadsDescription"],
    ],
  },
  {
    title: "notifications",
    settings: [
      ["transferSummaries", "transferSummariesDescription"],
      ["workspaceChanges", "workspaceChangesDescription"],
    ],
  },
] as const;

function SettingToggle({
  label,
  description,
  preference,
}: {
  label: string;
  description: string;
  preference: DesktopToggle;
}) {
  const enabled = useDesktopPreferences((state) => state[preference]);
  const togglePreference = useDesktopPreferences((state) => state.togglePreference);
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <Switch
        aria-label={label}
        checked={enabled}
        onCheckedChange={() => togglePreference(preference)}
      />
    </div>
  );
}

export function SettingsPage() {
  const t = useDesktopTranslations("settings");
  const theme = useDesktopPreferences((state) => state.theme);
  const toggleTheme = useDesktopPreferences((state) => state.toggleTheme);
  const [folder, setFolder] = useState("");
  const [folderStatus, setFolderStatus] = useState<PiRuntimeStatus | null>(null);

  return (
    <div className="page settings-page">
      <PageHeader className="mb-7" title={t("title")} description={t("description")} />
      <section className="settings-section">
        <h2>{t("theme")}</h2>
        <div className="settings-list">
          <div className="setting-row">
            <div>
              <strong>{theme === "dark" ? t("darkTheme") : t("lightTheme")}</strong>
              <p>{t("theme")}</p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {theme === "dark" ? t("lightTheme") : t("darkTheme")}
            </Button>
          </div>
        </div>
      </section>
      <section className="settings-section">
        <h2>{t("localProject")}</h2>
        <div className="settings-list">
          <div className="setting-row">
            <div>
              <strong>{t("projectFolder")}</strong>
              <p>{folderStatus?.authorizedProject ?? t("projectFolderDescription")}</p>
            </div>
            <div className="flex gap-2">
              <Field>
                <FieldLabel className="sr-only" htmlFor="project-folder">
                  {t("projectFolder")}
                </FieldLabel>
                <Input
                  id="project-folder"
                  className="h-10 min-w-0"
                  value={folder}
                  onChange={(event) => setFolder(event.target.value)}
                  placeholder={t("projectFolderPlaceholder")}
                />
              </Field>
              <Button
                variant="outline"
                disabled={!folder.trim()}
                onClick={() => void authorizeProjectFolder(folder.trim()).then(setFolderStatus)}
              >
                {t("bindFolder")}
              </Button>
            </div>
          </div>
          {folderStatus?.reason ? (
            <p className="text-xs text-muted-foreground">{folderStatus.reason}</p>
          ) : null}
        </div>
      </section>
      {sections.map((section) => (
        <section className="settings-section" key={section.title}>
          <h2>{t(section.title)}</h2>
          <div className="settings-list">
            {section.settings.map(([preference, description]) => (
              <SettingToggle
                key={preference}
                label={t(preference)}
                description={t(description)}
                preference={preference}
              />
            ))}
          </div>
        </section>
      ))}
      <section className="settings-section">
        <h2>{t("devices")}</h2>
        <Link
          className="inline-flex min-h-8 items-center rounded-lg border border-border px-3 text-sm text-primary hover:bg-muted"
          to="/devices"
        >
          {t("manageDevices")}
        </Link>
      </section>
    </div>
  );
}
