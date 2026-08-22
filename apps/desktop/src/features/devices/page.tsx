import { DeviceMobile, Laptop, Monitor, Sparkle, X } from "@phosphor-icons/react";
import { Button } from "@voidmix/ui/components/ui/button";
import { demoCloudSnapshot } from "../../lib/cloud";

export function DevicesPage() {
  const devices = demoCloudSnapshot.devices;
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Devices</h1>
          <p>Control which computers and phones can access this workspace.</p>
        </div>
        <Button className="primary-button" variant="primary">
          <Sparkle size={14} /> Pair device
        </Button>
      </header>
      <section className="device-list" aria-label="Registered devices">
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
                  {device.online ? "Online" : "Offline"}
                </span>
              </div>
              <div className="device-meta">
                <span>Last seen</span>
                <strong>{device.lastSeen}</strong>
              </div>
              <div className="device-meta">
                <span>Synced</span>
                <strong>{device.synced}</strong>
              </div>
              <Button
                className="icon-button"
                size="icon"
                variant="ghost"
                aria-label={`Remove ${device.name}`}
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
