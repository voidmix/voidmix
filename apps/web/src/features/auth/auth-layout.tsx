import { Link, Outlet } from "@tanstack/react-router";
import { Logo } from "@voidmix/ui/logo";
import { ThemeSwitcher } from "../../components/theme-switcher";
import { LanguageSwitcher } from "../../components/language-switcher";
import { ProductImage } from "../marketing/product-image";
import { useTranslations } from "../../i18n/client";

export function AuthLayout() {
  const t = useTranslations("marketing");
  return (
    <main className="auth-layout">
      <section className="auth-brand" aria-label={t("projectWorkbench")}>
        <Link to="/" aria-label={t("homeLabel")}>
          <Logo />
        </Link>
        <div>
          <h2>{t("workHeroTitle")}</h2>
          <p>{t("workHeroDescription")}</p>
        </div>
        <figure>
          <ProductImage />
          <figcaption>{t("sampleProject")}</figcaption>
        </figure>
      </section>
      <section className="auth-form-area">
        <div className="auth-preferences">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
        <Outlet />
      </section>
    </main>
  );
}
