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
    <main className="public-site bg-background text-foreground">
      <nav
        className="public-nav sticky top-0 z-40 flex h-16 items-center gap-8 border-b border-border bg-background px-[max(24px,calc((100%_-_1200px)/2))] [&>a]:shrink-0 [@media(max-width:767px)]:gap-3 [@media(max-width:767px)]:px-4 [@media(max-width:767px)]:[&_[data-slot=logo]>span]:hidden"
        aria-label={t("navLabel")}
      >
        <Link to="/" aria-label={t("homeLabel")}>
          <Logo />
        </Link>
        <div className="public-nav-links flex gap-6 text-sm leading-[1.6] text-muted-foreground [&_a:hover]:text-foreground [@media(max-width:1023px)]:hidden">
          <a href="#product">{t("product")}</a>
          <a href="#workflow">{t("workflow")}</a>
        </div>
        <div className="public-nav-actions ml-auto flex items-center gap-2 [@media(max-width:767px)]:gap-1">
          <LanguageSwitcher />
          <div className="public-header-theme [@media(max-width:767px)]:hidden">
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
      <section
        className="public-hero m-auto max-w-[768px] px-6 pt-22 pb-13 text-center [@media(max-width:1023px)]:pt-16 [@media(max-width:767px)]:px-5 [@media(max-width:767px)]:pt-14 [@media(max-width:767px)]:pb-10"
        aria-labelledby="hero-title"
      >
        <p className="public-intro flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
          <FolderSimple aria-hidden="true" />
          {t("projectWorkbench")}
        </p>
        <h1
          id="hero-title"
          className="my-6 text-[clamp(2.5rem,5vw,4rem)] leading-[1.08] font-semibold tracking-[-0.035em] whitespace-pre-line [@media(max-width:767px)]:text-[38px] [@media(max-width:767px)]:tracking-[-0.03em]"
        >
          {t("workHeroTitle")}
        </h1>
        <p className="public-hero-description m-auto max-w-[560px] text-base leading-[1.8] text-pretty text-muted-foreground [@media(max-width:767px)]:text-[15px]">
          {t("workHeroDescription")}
        </p>
        <div className="public-hero-actions mt-7 flex flex-wrap justify-center gap-2.5">
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
        <p className="public-hero-note mt-5 text-xs leading-[1.6] text-muted-foreground">
          {t("workHeroNote")}
        </p>
      </section>
      <section
        id="product"
        className="public-product m-auto max-w-[1248px] scroll-mt-22 px-6 [@media(max-width:767px)]:px-4"
        aria-label={t("product")}
      >
        <Tabs defaultValue="projects" className="gap-5">
          <div className="public-preview-toolbar flex flex-wrap items-center justify-between gap-3 [@media(max-width:767px)]:justify-center">
            <TabsList className="[@media(pointer:coarse)]:min-h-11" aria-label={t("previewLabel")}>
              <TabsTrigger className="[@media(pointer:coarse)]:min-h-11" value="projects">
                <FolderSimple aria-hidden="true" />
                {t("projectsTab")}
              </TabsTrigger>
              <TabsTrigger className="[@media(pointer:coarse)]:min-h-11" value="detail">
                <ListChecks aria-hidden="true" />
                {t("detailTab")}
              </TabsTrigger>
            </TabsList>
            <span className="text-xs leading-[1.6] text-muted-foreground [@media(max-width:767px)]:w-full [@media(max-width:767px)]:text-center">
              {t("sampleProject")}
            </span>
          </div>
          <TabsContent value="projects">
            <figure className="public-product-frame m-0 overflow-hidden rounded-xl border border-border">
              <ProductImage priority />
            </figure>
          </TabsContent>
          <TabsContent value="detail">
            <figure className="public-product-frame m-0 overflow-hidden rounded-xl border border-border">
              <ProductImage detail />
            </figure>
          </TabsContent>
        </Tabs>
      </section>
      <section
        id="workflow"
        className="public-workflow m-auto max-w-[1148px] scroll-mt-22 px-6 pt-28 [@media(max-width:767px)]:px-5 [@media(max-width:767px)]:pt-16"
        aria-labelledby="workflow-title"
      >
        <div className="public-section-heading mb-16 max-w-[620px] [@media(max-width:767px)]:mb-10">
          <h2
            id="workflow-title"
            className="text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.25] font-semibold tracking-[-0.025em]"
          >
            {t("workflowTitle")}
          </h2>
          <p className="mt-5 max-w-[54ch] leading-[1.8] text-pretty text-muted-foreground">
            {t("workflowDescription")}
          </p>
        </div>
        <article className="public-detail mb-20 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-16 [@media(max-width:1023px)]:gap-8 [@media(max-width:767px)]:mb-12 [@media(max-width:767px)]:grid-cols-1 [@media(max-width:767px)]:gap-6">
          <div className="public-detail-copy">
            <FolderSimple className="mb-5 size-6" aria-hidden="true" />
            <h3 className="mb-3 text-xl leading-[1.6] font-semibold tracking-[-0.015em]">
              {t("createTitle")}
            </h3>
            <p className="leading-[1.8] text-pretty text-muted-foreground">
              {t("createDescription")}
            </p>
            <p className="public-detail-note mt-5 border-t border-border pt-4 text-xs leading-[1.8] text-pretty text-muted-foreground">
              {t("projectFields")}
            </p>
          </div>
          <figure className="public-detail-frame m-0 rounded-xl border border-border bg-muted p-5 [&_img]:rounded-lg [@media(max-width:767px)]:p-3">
            <ProductImage variant="project-focus" />
          </figure>
        </article>
        <article className="public-detail public-detail-reverse mb-20 grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-center gap-16 [@media(max-width:1023px)]:gap-8 [@media(max-width:767px)]:mb-12 [@media(max-width:767px)]:grid-cols-1 [@media(max-width:767px)]:gap-6">
          <div className="public-detail-copy order-2 [@media(max-width:767px)]:order-none">
            <ListChecks className="mb-5 size-6" aria-hidden="true" />
            <h3 className="mb-3 text-xl leading-[1.6] font-semibold tracking-[-0.015em]">
              {t("organizeTitle")}
            </h3>
            <p className="leading-[1.8] text-pretty text-muted-foreground">
              {t("organizeDescription")}
            </p>
            <p className="public-detail-note mt-5 border-t border-border pt-4 text-xs leading-[1.8] text-pretty text-muted-foreground">
              {t("taskContext")}
            </p>
          </div>
          <figure className="public-detail-frame m-0 rounded-xl border border-border bg-muted p-5 [&_img]:rounded-lg [@media(max-width:767px)]:p-3">
            <ProductImage variant="task-focus" />
          </figure>
        </article>
        <div className="public-access mx-auto flex max-w-[720px] items-start gap-6 [@media(max-width:767px)]:gap-4">
          <Desktop className="mt-1 size-7 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="mb-3 text-xl leading-[1.6] font-semibold tracking-[-0.015em]">
              {t("accessTitle")}
            </h3>
            <p className="leading-[1.8] text-pretty text-muted-foreground">
              {t("accessDescription")}
            </p>
          </div>
        </div>
      </section>
      <section className="public-cta mx-auto mt-22 mb-20 max-w-[1148px] px-6 text-center [@media(max-width:767px)]:mt-14 [@media(max-width:767px)]:mb-12">
        <Separator className="mb-16 [@media(max-width:767px)]:mb-12" />
        <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.25] font-semibold tracking-[-0.025em]">
          {t("ctaTitle")}
        </h2>
        <p className="mt-4 mb-6 leading-[1.8] text-pretty text-muted-foreground">
          {t("ctaDescription")}
        </p>
        <Button size="lg" nativeButton={false} role="link" render={<Link to="/projects" />}>
          {t("openWorkbench")}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </section>
      <footer className="public-footer flex items-center gap-6 border-t border-border px-[max(24px,calc((100%_-_1200px)/2))] py-6 text-xs leading-[1.6] text-muted-foreground [@media(max-width:767px)]:flex-wrap [@media(max-width:767px)]:gap-5 [@media(max-width:767px)]:px-5">
        <Logo className="[@media(max-width:767px)]:order-4 [@media(max-width:767px)]:w-full" />
        <span className="[@media(max-width:767px)]:order-4 [@media(max-width:767px)]:w-full">
          {t("workHeroNote")}
        </span>
        <div className="public-footer-theme hidden [@media(max-width:767px)]:ml-auto [@media(max-width:767px)]:block">
          <ThemeSwitcher />
        </div>
        <a
          className="ml-auto flex items-center gap-2 [@media(max-width:767px)]:ml-0"
          href="https://github.com/voidmix/voidmix"
        >
          <GithubLogo aria-hidden="true" />
          {t("github")}
        </a>
      </footer>
    </main>
  );
}
