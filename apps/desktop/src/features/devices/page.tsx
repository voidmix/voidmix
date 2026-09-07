import { DeviceMobile, Laptop, Monitor, Sparkle, X } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { PageHeader } from "@voidmix/ui/page-header";
import { useTranslations } from "@voidmix/i18n/client";
import { demoCloudSnapshot } from "../../lib/cloud";

export function DevicesPage() {
  const t = useTranslations("devices");
  const devices = demoCloudSnapshot.devices;
  return (
    <div className="page">
      <PageHeader
        className="page-header"
        title={t("title")}
        description={t("description")}
        action={
          <Button className="primary-button" variant="primary">
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
                <strong>{device.lastSeen}</strong>
              </div>
              <div className="device-meta">
                <span>{t("synced")}</span>
                <strong>{device.synced}</strong>
              </div>
              <Button
                className="icon-button"
                size="icon"
                variant="ghost"
                aria-label={t("remove", { name: device.name })}
              >
                <X size={16} />
              </Button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
