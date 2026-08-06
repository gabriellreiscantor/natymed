import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/naty-med")({
  head: () => ({
    meta: [
      { title: "Naty Med" },
      { name: "description", content: "Naty Med" },
      { property: "og:title", content: "Naty Med" },
      { property: "og:description", content: "Naty Med" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NatyMedPage,
});

function NatyMedPage() {
  return <div className="min-h-screen" />;
}
