import { createFileRoute } from "@tanstack/react-router";
import { AtlasApp } from "@/components/atlas/AtlasApp";

type Start = "contribute" | "import" | "method";

export const Route = createFileRoute("/archive")({
  validateSearch: (search: Record<string, unknown>) => ({
    start: search.start === "contribute" || search.start === "import" || search.start === "method" ? (search.start as Start) : undefined,
  }),
  component: Archive,
});

function Archive() {
  const { start } = Route.useSearch();
  return <AtlasApp initialView={start ?? "explore"} />;
}
