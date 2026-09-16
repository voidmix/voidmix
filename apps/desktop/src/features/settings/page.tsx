import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { useDesktopTranslations } from "../../i18n/client";
import { cn } from "@voidmix/ui/lib/utils";
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
      <Button
        className={cn("toggle", enabled && "enabled")}
        variant="ghost"
        role="switch"
        aria-label={label}
        aria-checked={enabled}
        onClick={() => togglePreference(preference)}
      >
        <span />
      </Button>
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
      <PageHeader className="page-header" title={t("title")} description={t("description")} />
      <section className="settings-section">
        <h2>{t("theme")}</h2>
        <div className="settings-list">
          <div className="setting-row">
            <div>
              <strong>{theme === "dark" ? t("darkTheme") : t("lightTheme")}</strong>
              <p>{t("theme")}</p>
            </div>
            <Button className="secondary-button" variant="outline" onClick={toggleTheme}>
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
              <input
                className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm"
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
                placeholder={t("projectFolderPlaceholder")}
                aria-label={t("projectFolder")}
              />
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
        <Link className="secondary-button settings-device-link" to="/devices">
          {t("manageDevices")}
        </Link>
      </section>
    </div>
  );
}
