import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/sign-in")({
  beforeLoad: ({ context }) => {
    if ((context as any)?.userId) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-background">
      {/* Left panel — branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 lg:flex lg:w-[52%]">
        {/* Grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            filter: "invert(1)",
          }}
        />
        {/* Glow orbs */}
        <div
          className="pointer-events-none absolute top-[-10%] left-[-5%] h-[55%] w-[55%] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(0.51 0.19 265) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute right-[-10%] bottom-[-10%] h-[45%] w-[45%] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, oklch(0.65 0.18 265) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <svg
              className="size-4 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">
            PeoplePay360
          </span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="font-medium text-[11px] text-white/40 uppercase tracking-[0.18em]">
              HR & Payroll Platform
            </p>
            <h1 className="font-bold text-4xl text-white leading-[1.1] tracking-tight xl:text-5xl">
              People operations,
              <br />
              <span className="text-primary">precisely run.</span>
            </h1>
            <p className="max-w-[38ch] text-sm text-white/50 leading-relaxed">
              From contracts to payslips, attendance to time-off — every
              workflow in one governed workspace.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 border-white/10 border-t pt-6">
            {[
              { value: "5-tier", label: "RBAC hierarchy" },
              { value: "Real-time", label: "payrun engine" },
              { value: "Zero", label: "manual exports" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-semibold text-sm text-white">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 max-w-[40ch] text-[11px] text-white/25 italic leading-relaxed">
          "Built for organizations where payroll accuracy and compliance are
          non-negotiable."
        </p>
      </div>

      {/* Right panel — Clerk widget */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-10 flex items-center gap-2.5 lg:hidden">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <svg
              className="size-3.5 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-semibold text-foreground text-sm tracking-tight">
            PeoplePay360
          </span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-semibold text-foreground text-xl tracking-tight">
              Sign in to your workspace
            </h2>
            <p className="text-muted-foreground text-sm">
              Access is restricted to authorized personnel.
            </p>
          </div>
          <SignIn routing="path" signUpUrl="/sign-up" />
        </div>
      </div>
    </div>
  );
}
