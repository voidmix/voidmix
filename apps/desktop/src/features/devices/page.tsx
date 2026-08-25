import { DeviceMobile, Laptop, Monitor, Sparkle, X } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { useTranslations } from "@voidmix/i18n/client";
import { demoCloudSnapshot } from "../../lib/cloud";
import { loadDeviceMessages } from "../../i18n/devices";

export function DevicesPage() {
  const t = useTranslations("devices", loadDeviceMessages);
  const devices = demoCloudSnapshot.devices;
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
        <Button className="primary-button" variant="primary">
          <Sparkle size={14} /> {t("pair")}
        </Button>
      </header>
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
