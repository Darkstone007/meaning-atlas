import { createFileRoute } from "@tanstack/react-router";
import { Carry } from "@/components/atlas/Carry";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Carry />;
}
