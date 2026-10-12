import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/atlas/Landing";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Landing />;
}
