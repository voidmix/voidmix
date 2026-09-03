import { useTranslations } from "@voidmix/i18n/client";
import { Logo } from "@voidmix/ui/logo";

export function HomeFooter() {
  const t = useTranslations("home");

  return (
    <footer className="home-footer w-full border-t border-border bg-card px-2 py-5 text-muted-foreground min-[761px]:pl-[4.75rem] min-[1181px]:pl-[15rem] sm:px-3">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Logo className="text-[0.78rem] text-foreground" />
          <span aria-hidden="true" className="text-border">
            /
          </span>
          <span>{t("previewEnvironment")}</span>
        </div>
        <span className="font-mono text-[0.68rem]">© {new Date().getFullYear()} Voidmix</span>
      </div>
    </footer>
  );
}
