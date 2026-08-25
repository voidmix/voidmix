import { createFileRoute } from "@tanstack/react-router";

const manifest = {
  id: "/",
  name: "VoidMix",
  short_name: "VoidMix",
  description:
    "Voidmix keeps briefs, feedback, decisions, people, and delivery visible in one live creative workspace.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#FAFAFA",
  theme_color: "#0A0A0A",
  lang: "en",
  dir: "ltr",
  icons: [
    {
      src: "/favicon.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
  ],
} as const;

export const Route = createFileRoute("/manifest.webmanifest")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(manifest), {
          headers: {
            "cache-control": "public, max-age=3600, s-maxage=86400",
            "content-type": "application/manifest+json; charset=utf-8",
          },
        }),
    },
  },
});
