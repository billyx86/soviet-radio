import { createFileRoute } from "@tanstack/react-router";
import { Radio } from "../components/Radio";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen">
      <Radio />
    </main>
  );
}
