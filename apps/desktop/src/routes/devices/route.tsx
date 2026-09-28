import { DeviceMobile, Laptop, Monitor } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@voidmix/ui/empty-state";
import { PageHeader } from "@voidmix/ui/page-header";
import { RefreshButton } from "../../features/shell/route-state";
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
  const result = Route.useLoaderData();
  const devices = result.source === "cloud" ? result.snapshot.devices : [];
  return (
    <div className="page">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={<RefreshButton routeId={Route.id} />}
      />
      {result.source !== "cloud" ? (
        <EmptyState title={t("unavailable")} description={t("unavailableDescription")} />
      ) : devices.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyDescription")} />
      ) : null}
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
            </article>
          );
        })}
      </section>
    </div>
  );
}
