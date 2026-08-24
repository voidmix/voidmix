import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";

export function SettingsNavigation({ current }: { current: "auth" | "mail" }) {
  return (
    <nav aria-label="System settings sections" className="mb-5 flex flex-wrap gap-2">
      <Button
        nativeButton={false}
        render={<Link to="/admin/settings" />}
        variant={current === "mail" ? "primary" : "outline"}
      >
        Mail delivery
      </Button>
      <Button
        nativeButton={false}
        render={<Link to="/admin/settings/auth" />}
        variant={current === "auth" ? "primary" : "outline"}
      >
        Authentication
      </Button>
    </nav>
  );
}
