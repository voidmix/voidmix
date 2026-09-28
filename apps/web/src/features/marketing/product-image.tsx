import { useLocale, useTranslations } from "../../i18n/client";

/** Captured from the real project routes with synthetic local test data. */
export function ProductImage({ detail = false }: { detail?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("marketing");
  const source = `/product/${detail ? "detail" : "projects"}-${locale}.png`;
  return (
    <img
      src={source}
      width={1200}
      height={800}
      alt={t(detail ? "detailImageAlt" : "projectsImageAlt")}
      loading={detail ? "lazy" : "eager"}
      decoding="async"
    />
  );
}
