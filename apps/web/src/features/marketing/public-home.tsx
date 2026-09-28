import { ArrowRight, GithubLogo } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { Logo } from "@voidmix/ui/logo";
import { useTranslations } from "../../i18n/client";
import { LanguageSwitcher } from "../../components/language-switcher";
import { ThemeSwitcher } from "../../components/theme-switcher";
import { ProductImage } from "./product-image";

export function PublicHome() {
  const t = useTranslations("marketing");
  return (
    <main className="public-site">
      <nav className="public-nav" aria-label={t("navLabel")}>
        <Link to="/" aria-label={t("homeLabel")}>
          <Logo />
        </Link>
        <div className="public-nav-links">
          <a href="#product">{t("product")}</a>
          <a href="#workflow">{t("workflow")}</a>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <Link to="/login" className="public-login">
            {t("login")}
          </Link>
          <Button nativeButton={false} render={<Link to="/projects" />}>
            {t("openWorkbench")}
          </Button>
        </div>
      </nav>
      <section className="public-hero" aria-labelledby="hero-title">
        <div className="public-hero-copy">
          <span className="public-wordmark">{t("projectWorkbench")}</span>
          <h1 id="hero-title">{t("workHeroTitle")}</h1>
          <p>{t("workHeroDescription")}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" nativeButton={false} render={<Link to="/projects" />}>
              {t("openWorkbench")}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" nativeButton={false} render={<a href="#product" />}>
              {t("seeProduct")}
            </Button>
          </div>
          <p className="public-hero-note">{t("workHeroNote")}</p>
        </div>
        <figure className="public-hero-image">
          <ProductImage />
          <figcaption>{t("sampleProject")}</figcaption>
        </figure>
      </section>
      <section id="product" className="public-product" aria-labelledby="product-title">
        <div className="public-section-heading">
          <h2 id="product-title">{t("productTitle")}</h2>
          <p>{t("productDescription")}</p>
        </div>
        <figure className="public-product-image">
          <ProductImage detail />
          <figcaption>{t("sampleProject")}</figcaption>
        </figure>
      </section>
      <section id="workflow" className="public-workflow" aria-labelledby="workflow-title">
        <h2 id="workflow-title">{t("workflowTitle")}</h2>
        <ol>
          {(["create", "organize", "access"] as const).map((step, index) => (
            <li key={step}>
              <span className="public-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3>{t(`${step}Title`)}</h3>
                <p>{t(`${step}Description`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="public-cta">
        <div>
          <h2>{t("ctaTitle")}</h2>
          <p>{t("ctaDescription")}</p>
        </div>
        <Button size="lg" nativeButton={false} render={<Link to="/projects" />}>
          {t("openWorkbench")}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </section>
      <footer className="public-footer">
        <Logo />
        <span>{t("workHeroNote")}</span>
        <a href="https://github.com/voidmix/voidmix">
          <GithubLogo aria-hidden="true" />
          {t("github")}
        </a>
      </footer>
    </main>
  );
}
