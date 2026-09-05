import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/payroll/payruns/")({
  component: PayrunsPage,
});

function PayrunsPage() {
  return (
    <div className="p-6">
      <h1 className="font-semibold text-foreground text-xl">Payruns</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Payrun list — Stage 7.
      </p>
    </div>
  );
}
