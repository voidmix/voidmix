import { ArrowRight, Desktop, FolderSimple, GithubLogo, ListChecks } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@voidmix/ui/components/ui/tabs";
import { Separator } from "@voidmix/ui/components/ui/separator";
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
        <div className="public-nav-actions">
          <LanguageSwitcher />
          <div className="public-header-theme">
            <ThemeSwitcher />
          </div>
          <Button variant="ghost" nativeButton={false} role="link" render={<Link to="/login" />}>
            {t("login")}
          </Button>
          <Button nativeButton={false} role="link" render={<Link to="/projects" />}>
            {t("openWorkbench")}
          </Button>
        </div>
      </nav>
      <section className="public-hero" aria-labelledby="hero-title">
        <p className="public-intro">
          <FolderSimple aria-hidden="true" />
          {t("projectWorkbench")}
        </p>
        <h1 id="hero-title">{t("workHeroTitle")}</h1>
        <p className="public-hero-description">{t("workHeroDescription")}</p>
        <div className="public-hero-actions">
          <Button size="lg" nativeButton={false} role="link" render={<Link to="/projects" />}>
            {t("openWorkbench")}
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            role="link"
            render={<a href="#product" />}
          >
            {t("seeProduct")}
          </Button>
        </div>
        <p className="public-hero-note">{t("workHeroNote")}</p>
      </section>
      <section id="product" className="public-product" aria-label={t("product")}>
        <Tabs defaultValue="projects" className="gap-5">
          <div className="public-preview-toolbar">
            <TabsList aria-label={t("previewLabel")}>
              <TabsTrigger value="projects">
                <FolderSimple aria-hidden="true" />
                {t("projectsTab")}
              </TabsTrigger>
              <TabsTrigger value="detail">
                <ListChecks aria-hidden="true" />
                {t("detailTab")}
              </TabsTrigger>
            </TabsList>
            <span>{t("sampleProject")}</span>
          </div>
          <TabsContent value="projects">
            <figure className="public-product-frame">
              <ProductImage priority />
            </figure>
          </TabsContent>
          <TabsContent value="detail">
            <figure className="public-product-frame">
              <ProductImage detail />
            </figure>
          </TabsContent>
        </Tabs>
      </section>
      <section id="workflow" className="public-workflow" aria-labelledby="workflow-title">
        <div className="public-section-heading">
          <h2 id="workflow-title">{t("workflowTitle")}</h2>
          <p>{t("workflowDescription")}</p>
        </div>
        <article className="public-detail">
          <div className="public-detail-copy">
            <FolderSimple aria-hidden="true" />
            <h3>{t("createTitle")}</h3>
            <p>{t("createDescription")}</p>
            <p className="public-detail-note">{t("projectFields")}</p>
          </div>
          <figure className="public-detail-frame">
            <ProductImage variant="project-focus" />
          </figure>
        </article>
        <article className="public-detail public-detail-reverse">
          <div className="public-detail-copy">
            <ListChecks aria-hidden="true" />
            <h3>{t("organizeTitle")}</h3>
            <p>{t("organizeDescription")}</p>
            <p className="public-detail-note">{t("taskContext")}</p>
          </div>
          <figure className="public-detail-frame">
            <ProductImage variant="task-focus" />
          </figure>
        </article>
        <div className="public-access">
          <Desktop aria-hidden="true" />
          <div>
            <h3>{t("accessTitle")}</h3>
            <p>{t("accessDescription")}</p>
          </div>
        </div>
      </section>
      <section className="public-cta">
        <Separator />
        <h2>{t("ctaTitle")}</h2>
        <p>{t("ctaDescription")}</p>
        <Button size="lg" nativeButton={false} role="link" render={<Link to="/projects" />}>
          {t("openWorkbench")}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </section>
      <footer className="public-footer">
        <Logo />
        <span>{t("workHeroNote")}</span>
        <div className="public-footer-theme">
          <ThemeSwitcher />
        </div>
        <a href="https://github.com/voidmix/voidmix">
          <GithubLogo aria-hidden="true" />
          {t("github")}
        </a>
      </footer>
    </main>
  );
}
