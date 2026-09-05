import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="font-semibold text-foreground text-xl">Reports</h1>
      <p className="mt-1 text-muted-foreground text-sm">Reporting — Stage 9.</p>
    </div>
  );
}
