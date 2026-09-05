import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-background">
      {/* Left panel — Clerk widget */}
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
          <span className="font-semibold text-sm tracking-tight text-foreground">
            PeoplePay360
          </span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-semibold text-xl text-foreground tracking-tight">
              Create your account
            </h2>
            <p className="text-muted-foreground text-sm">
              Your admin will assign your role after sign-up.
            </p>
          </div>
          <SignUp routing="path" signInUrl="/sign-in" />
        </div>
      </div>

      {/* Right panel — branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 lg:flex lg:w-[48%]">
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
        <div
          className="pointer-events-none absolute top-[-10%] right-[-5%] h-[55%] w-[55%] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(0.51 0.19 265) 0%, transparent 70%)",
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
          <span className="font-semibold text-sm tracking-tight text-white">
            PeoplePay360
          </span>
        </div>

        {/* Steps */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <p className="font-medium text-[11px] uppercase tracking-[0.18em] text-white/40">
              Getting started
            </p>
            <h2 className="font-bold text-3xl leading-[1.1] tracking-tight text-white xl:text-4xl">
              Three steps to
              <br />
              <span className="text-primary">full access.</span>
            </h2>
          </div>

          <div className="space-y-5">
            {[
              {
                n: "01",
                title: "Create your account",
                desc: "Sign up with your work email address.",
              },
              {
                n: "02",
                title: "Admin assigns your role",
                desc: "Your system admin links you to an employee record and sets your permission tier.",
              },
              {
                n: "03",
                title: "Access your workspace",
                desc: "Log payroll, review attendance, or manage your team — based on your role.",
              },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-4">
                <span className="mt-0.5 shrink-0 font-mono text-[11px] text-white/30">
                  {step.n}
                </span>
                <div>
                  <p className="font-medium text-sm text-white">{step.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-white/40">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-[12px] leading-relaxed text-white/50">
            Access is governed by a 5-tier RBAC system. Self-signups grant no
            permissions until an admin reviews and assigns your role.
          </p>
        </div>
      </div>
    </div>
  );
}
