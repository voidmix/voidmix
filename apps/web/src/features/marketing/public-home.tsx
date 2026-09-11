import {
  ArrowRight,
  Code,
  Cpu,
  FileText,
  GithubLogo,
  Globe,
  Lightning,
  PresentationChart,
  UsersThree,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@voidmix/ui/components/ui/button";
import { useTranslations } from "../../i18n/client";

const capabilityKeys = [
  ["capabilitySite", Globe],
  ["capabilityApp", Code],
  ["capabilityLanding", Lightning],
  ["capabilityMiniProgram", Cpu],
  ["capabilityDeck", PresentationChart],
  ["capabilityData", FileText],
] as const;
const useCaseKeys = [
  ["useCaseBrand", "01"],
  ["useCaseGrowth", "02"],
  ["useCaseProduct", "03"],
  ["useCaseData", "04"],
] as const;

export function PublicHome() {
  const t = useTranslations("marketing");

  return (
    <main className="min-h-dvh bg-[#f7f9fc] text-[#111827]">
      <nav
        className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl"
        aria-label={t("navLabel")}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
            aria-label={t("homeLabel")}
          >
            <span className="grid size-8 place-items-center rounded-xl bg-[#5865f2] text-sm font-bold text-white">
              V
            </span>
            <span>VoidMix</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#capabilities" className="hover:text-[#5865f2]">
              {t("navCapabilities")}
            </a>
            <a href="#cases" className="hover:text-[#5865f2]">
              {t("navCases")}
            </a>
            <a href="#community" className="hover:text-[#5865f2]">
              {t("navCommunity")}
            </a>
            <a href="#docs" className="hover:text-[#5865f2]">
              {t("navDocs")}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden px-3 py-2 text-sm text-slate-600 hover:text-[#5865f2] sm:inline"
            >
              {t("login")}
            </Link>
            <Button
              nativeButton={false}
              render={<Link to="/signup" />}
              className="rounded-xl bg-[#5865f2] px-4 text-white hover:bg-[#4752c4]"
            >
              {t("startFree")} <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </nav>

      <section
        className="relative overflow-hidden px-5 pb-20 pt-20 sm:px-8 sm:pt-28"
        aria-labelledby="hero-title"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-[540px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(88,101,242,.16),transparent_65%)]" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[.22em] text-[#5865f2]">
            {t("eyebrow")}
          </p>
          <h1
            id="hero-title"
            className="mx-auto max-w-4xl text-4xl font-semibold tracking-[-.04em] text-balance sm:text-6xl"
          >
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            {t("heroDescription")}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button
              nativeButton={false}
              render={<Link to="/signup" />}
              size="lg"
              className="h-11 rounded-xl bg-[#5865f2] px-6 text-white hover:bg-[#4752c4]"
            >
              {t("createFree")} <ArrowRight />
            </Button>
            <a
              href="#capabilities"
              className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-medium hover:border-[#5865f2] hover:text-[#5865f2]"
            >
              {t("viewCapabilities")}
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">{t("heroNote")}</p>
        </div>
        <div className="relative mx-auto mt-16 max-w-5xl rounded-2xl border border-slate-200 bg-[#10162a] p-3 shadow-2xl shadow-indigo-200/40">
          <div className="rounded-xl border border-white/10 bg-[#151d35] p-5 text-left sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs text-slate-400">
              <span>{t("previewProject")}</span>
              <span className="text-emerald-300">{t("piRunning")}</span>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-[180px_1fr_180px]">
              <div className="space-y-2">
                <p className="text-xs text-slate-500">{t("agents")}</p>
                {[t("agentPm"), t("agentDev"), t("agentQa")].map((x, i) => (
                  <div
                    key={x}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
                  >
                    <span
                      className={`mr-2 inline-block size-2 rounded-full ${i === 1 ? "bg-cyan-300" : "bg-violet-300"}`}
                    />
                    {x}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-xs text-slate-500">{t("coworkingLog")}</p>
                {[t("logPm"), t("logDev"), t("logQa")].map((x) => (
                  <div
                    key={x}
                    className="rounded-lg border border-white/10 bg-[#0d1325] px-4 py-3 text-sm text-slate-200"
                  >
                    {x}
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/5 p-4">
                <p className="text-xs text-cyan-200">{t("output")}</p>
                <p className="mt-3 text-sm text-white">{t("outputFolder")}</p>
                <p className="mt-1 text-xs text-slate-400">{t("outputFiles")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="capabilities"
        className="mx-auto max-w-6xl px-5 py-20 sm:px-8"
        aria-labelledby="capabilities-title"
      >
        <div className="mb-10 max-w-xl">
          <p className="text-sm font-semibold text-[#5865f2]">{t("capabilityEyebrow")}</p>
          <h2
            id="capabilities-title"
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {t("capabilityTitle")}
          </h2>
          <p className="mt-4 text-slate-600">{t("capabilityDescription")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilityKeys.map(([key, Icon]) => (
            <article
              key={key}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg motion-reduce:transform-none"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-[#5865f2]">
                <Icon size={21} aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-semibold">{t(`${key}Title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t(`${key}Description`)}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#5865f2]">
                {t("learnMore")} <ArrowRight size={15} />
              </span>
            </article>
          ))}
        </div>
      </section>

      <section
        id="cases"
        className="border-y border-slate-200 bg-white px-5 py-20 sm:px-8"
        aria-labelledby="cases-title"
      >
        <div className="mx-auto max-w-6xl">
          <h2 id="cases-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("casesTitle")}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {useCaseKeys.map(([key, no]) => (
              <article key={key} className="rounded-2xl bg-[#f7f9fc] p-6">
                <span className="text-xs font-semibold text-[#5865f2]">{no}</span>
                <h3 className="mt-12 font-semibold">{t(`${key}Title`)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t(`${key}Description`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="community" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-8 rounded-3xl bg-[#111936] p-8 text-white sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-cyan-300">{t("communityEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{t("communityTitle")}</h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-300">{t("communityDescription")}</p>
          </div>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            {t("exploreCommunity")} <ArrowRight />
          </Button>
        </div>
      </section>

      <section
        id="docs"
        className="border-t border-slate-200 bg-white px-5 py-20 text-center sm:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <UsersThree className="mx-auto text-[#5865f2]" size={28} aria-hidden="true" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">{t("docsTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">{t("docsDescription")}</p>
          <div className="mt-8">
            <Button
              nativeButton={false}
              render={<Link to="/signup" />}
              size="lg"
              className="h-11 rounded-xl bg-[#5865f2] px-7 text-white hover:bg-[#4752c4]"
            >
              {t("createWorkspace")} <ArrowRight />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#f7f9fc] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-semibold text-slate-800">VoidMix</span>
            <p className="mt-1">{t("footerTagline")}</p>
          </div>
          <div className="flex items-center gap-5">
            <a href="#capabilities" className="hover:text-[#5865f2]">
              {t("navCapabilities")}
            </a>
            <a href="#community" className="hover:text-[#5865f2]">
              {t("footerCommunity")}
            </a>
            <a href="#docs" className="hover:text-[#5865f2]">
              {t("navDocs")}
            </a>
            <GithubLogo size={19} aria-label={t("github")} />
          </div>
        </div>
      </footer>
    </main>
  );
}
