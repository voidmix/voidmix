import { DeviceMobile, Laptop, Monitor, Sparkle, X } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { useDesktopTranslations, useFormatter } from "../../i18n/client";
import { formatCloudTime } from "../../i18n/time";
import { loadCloudSnapshot, formatBytes } from "../../lib/cloud";

export const Route = createFileRoute("/devices")({
  ssr: false,
  loader: ({ abortController }) => loadCloudSnapshot({ signal: abortController.signal }),
  component: DevicesPage,
});

function DevicesPage() {
  const t = useDesktopTranslations("devices");
  const formatter = useFormatter();
  const { snapshot } = Route.useLoaderData();
  const devices = snapshot.devices;
  return (
    <div className="page">
      <PageHeader
        className="mb-7"
        title={t("title")}
        description={t("description")}
        action={
          <Button variant="primary">
            <Sparkle size={14} /> {t("pair")}
          </Button>
        }
      />
      <section className="device-list" aria-label={t("registered")}>
        {devices.map((device) => {
          const Icon =
            device.kind === "phone" ? DeviceMobile : device.kind === "desktop" ? Monitor : Laptop;
          return (
            <article className="device-row" key={device.id}>
              <span className="device-icon">
                <Icon size={20} />
              </span>
              <div className="device-name">
                <strong>{device.name}</strong>
                <span>{device.platform}</span>
              </div>
              <div>
                <span className={device.online ? "presence online" : "presence"}>
                  {device.online ? t("online") : t("offline")}
                </span>
              </div>
              <div className="device-meta">
                <span>{t("lastSeen")}</span>
                <strong>{formatCloudTime(formatter, device.lastSeen)}</strong>
              </div>
              <div className="device-meta">
                <span>{t("synced")}</span>
                <strong>{formatBytes(device.syncedBytes, formatter)}</strong>
              </div>
              <Button size="icon" variant="ghost" aria-label={t("remove", { name: device.name })}>
                <X size={16} />
              </Button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
