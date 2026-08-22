import { Button } from "@voidmix/ui/components/ui/button";
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
  const sections = useMemo(
    () => [
      {
        title: "Sync behavior",
        settings: [
          [
            "Start with the system",
            "Keep Voidmix ready after you sign in to this computer.",
            false,
          ] as const,
          [
            "Sync on metered networks",
            "Continue transfers when your connection has a data limit.",
            false,
          ] as const,
          [
            "Download new files automatically",
            "Keep a local copy of files added by teammates.",
            true,
          ] as const,
        ],
      },
      {
        title: "Notifications",
        settings: [
          [
            "Transfer summaries",
            "Notify me when a large upload or download completes.",
            true,
          ] as const,
          [
            "Workspace changes",
            "Show desktop notices for device and access changes.",
            true,
          ] as const,
        ],
      },
    ],
    [],
  );

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Choose how Voidmix behaves on this computer.</p>
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
