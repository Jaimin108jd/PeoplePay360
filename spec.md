# PeoplePay360 — HR & Payroll Platform — Build Spec

A real HR & Payroll operations platform. Employee lifecycle, contracts, attendance, time off, a configurable salary-rule engine, payrun processing, payslip PDF generation, and bulk email delivery — all connected as one system instead of isolated CRUD screens. **No separate backend** — Convex is the entire server: database, business logic (queries/mutations/actions), file storage (payslip PDFs), scheduled jobs, and the Clerk-auth bridge all live in `convex/`.

The build is split into independent, shippable stages, same spirit as a typical hackathon/portfolio build-out: the app should run end-to-end at the close of every stage.

---

## 1. Product overview

**Tagline:** _Employee → Contract → Schedule → Attendance & Time Off → Salary Rules → Payrun → Payslip → Validation → Paid → Reporting._

**Core idea:** HR data is not a pile of independent tables. An employee's active contract for a given payroll period drives their wage; their schedule drives expected hours; attendance and approved time off drive worked days and leave balances; a Salary Structure's ordered Salary Rules actually compute the payslip — nothing is hardcoded.

**Core flows**

1. Sign in via Clerk (email + Google OAuth). Role assigned by an Admin (Employee / HR Manager / HR Payroll User / HR Payroll Manager / Admin).
2. HR creates an Employee, assigns a Department, Manager, Working Schedule, and an initial Contract (with a Salary Structure).
3. Attendance accrues (manual check-in/out for the demo, correctable by HR) and Time Off requests move through Pending → Approved/Refused, consuming leave allocations on approval.
4. HR Payroll creates a **Payrun** via a two-step wizard (pick Salary Structure + period, then explicitly select eligible employees).
5. **Compute** runs every selected employee's applicable contract + salary rules, in sequence, into a Payslip with line items.
6. **Validate** surfaces warnings (missing bank details, missing contract, duplicate payslip, calculation problems) before finalization.
7. **Mark Paid** moves the Payrun through its lifecycle (Draft → Computed → Validated → Paid) and payslips become immutable history.
8. Each Payslip can be printed to PDF; the Payrun can **Send Payslips** to bulk-email every employee in the batch.
9. The Dashboard aggregates live payroll + HR data by period, department, and employee type — no static mock numbers.

**Out of scope (intentionally, per the source hackathon brief):** real banking/payment rails, multi-country tax compliance, ATS/recruitment, mobile apps, email infra beyond a transactional provider, elaborate reporting suites.

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| App framework | **TanStack Start** (React 19, Vite, TanStack Router) | File-based routes, full-document SSR, type-safe search params & loaders, server functions (`createServerFn`) for anything that isn't a Convex call |
| Language | TypeScript everywhere | Shared types between Convex functions and the client via `convex/_generated` |
| Auth | **Clerk** (`@clerk/tanstack-react-start`) | Email + Google OAuth, Organizations feature *not* used — role is a single-tenant field on the user, not an org membership (see §6) |
| Backend / DB | **Convex** | Reactive document DB + `query`/`mutation`/`action` functions + scheduled functions (`crons.ts`) + file storage for PDFs. Convex is the *only* backend — no separate REST/API layer |
| Auth bridge | `convex/auth.config.ts` (Clerk JWT template) + a Clerk **webhook** → Convex HTTP action (`convex/http.ts`) | Convex validates the Clerk-issued JWT on every function call; the webhook keeps a mirrored `users` row (with `role`) in sync on `user.created` / `user.updated` |
| UI components | **shadcn/ui** (Radix primitives + Tailwind) | `table`, `dialog`, `sheet`, `form` (react-hook-form + zod resolver), `command`, `badge`, `tabs`, `calendar`, `chart` (Recharts wrapper) |
| Styling | Tailwind v4 + shadcn tokens | See §3 Design Language |
| Forms & validation | `react-hook-form` + `zod` | Same Zod schemas reused as Convex `v.*` validators where practical (via `convex-helpers/validators` or hand-mirrored) |
| Tables | `@tanstack/react-table` | Server-side-feeling filtering/sorting driven by Convex `paginatedQuery` |
| Charts | `recharts` via shadcn `chart` wrapper | Dashboard KPIs, salary-by-department, monthly net-salary trend |
| PDF generation | `@react-pdf/renderer`, run inside a Convex **action** (Node runtime) | Renders a Payslip to a PDF buffer, stored via `ctx.storage.store()`, returns a `storageId` saved on the payslip row |
| Email | **Resend** (`resend` SDK) via a Convex action, or the official `@convex-dev/resend` Convex Component if available at build time | Bulk payslip delivery, invite emails |
| Date/calc | `date-fns` | Period math, working-hours math, contract-window overlap checks |
| State | Convex's own reactive `useQuery`/`usePaginatedQuery` (no extra client cache layer needed — Convex *is* the cache) | Local UI-only state via `useState`/`zustand` if a screen needs it (e.g. multi-step wizard state) |
| Icons | `lucide-react` | Already a shadcn dependency |

**Why TanStack Start + Convex instead of Next.js:** file-based SSR + server functions without needing API routes for anything Convex doesn't already do (auth callbacks, Clerk webhook receiver aside — that lives in Convex's own HTTP router, not in the app). Router loaders can `preload` Convex queries so the first paint isn't a waterfall.

---

## 3. Design language

The visual direction should read as **precise, dense, and trustworthy** — this is a payroll system handling real money and real people's leave balances, not a marketing site. Screenshots of this should look credible next to an internal tool at ING/Adyen/Mollie, not like a generic admin template.

**Reference base:** pull [`VoltAgent/awesome-design-md`](https://github.com/VoltAgent/awesome-design-md)'s **Linear** `DESIGN.md` into the repo root as a starting point for an agent-readable design system:

```bash
npx getdesign@latest add linear.app
```

Linear's system (*ultra-minimal, precise, purple accent, information-dense*) is the right base because this app is dominated by dense tables (attendance, payslip lines, payrun batches) and multi-step forms — exactly what that system is tuned for. Adapt it as follows for PeoplePay360 rather than using it verbatim:

| Token | Value | Role |
|---|---|---|
| `--background` | `oklch(1 0 0)` / dark `oklch(0.14 0 0)` | App canvas |
| `--foreground` | `oklch(0.145 0 0)` / dark `oklch(0.985 0 0)` | Primary text |
| `--primary` (accent) | Indigo `oklch(0.51 0.19 265)` | Replaces Linear's purple — reads as "financial/trust" rather than "dev tool"; used for primary actions, active nav, focus rings |
| `--muted` | Zinc-100 / Zinc-900 | Card backgrounds, table stripe, sidebar |
| `--success` | Green `oklch(0.6 0.15 145)` | Paid, Present, Approved, "All checks passed" |
| `--warning` | Amber `oklch(0.75 0.15 80)` | Payrun warnings, Late, Pending |
| `--destructive` | Red `oklch(0.55 0.22 25)` | Refused, Missing data, calculation errors |
| Font | `Inter` (variable), `font-feature-settings: "tnum" 1` on any numeric table cell | Tabular numerals are non-negotiable for a payroll app — misaligned currency columns look broken |
| Radius | `--radius: 0.5rem` | shadcn default `md`; keep every card/input/button on the same scale, no mixed radii |
| Density | Compact | Table rows `h-10`, form field spacing `gap-4`, no oversized marketing-style padding on internal screens |

**Component rules**

- **Status is always a `<Badge>`**, never plain colored text: Payrun status (Draft/Computed/Validated/Paid), Payslip status, Attendance status (Present/Late/Exception/Overtime), Time-Off status (Pending/Approved/Refused). One consistent color→status mapping app-wide, defined once in `lib/status-colors.ts`.
- **Money is always right-aligned, tabular-nums, with the ₹ symbol prefixed** — never a separate currency column.
- **Every list screen** (Employees, Contracts, Attendance, Time Off, Payruns, Payslips) is a `DataTable` built once (`components/ui/data-table.tsx`) and reused — column defs differ, chrome doesn't.
- **Smart-button pattern** on the Employee detail page (Contracts: 2 / Attendance: 23 / Time Off: 3 / Allocations: 2) — a small stat pill that navigates to a pre-filtered view. This is the single most "connected system" visual cue from the source spec and should not be skipped.
- **Wizard steps** (Payrun creation) use shadcn `Tabs` or a controlled stepper, never a single giant form — Step 1 (structure + period) must not create anything until Step 2's employee selection is confirmed.
- **Dark mode** ships from Stage 1, not bolted on later — `next-themes`-style toggle, tokens above already define both.

---

## 4. Configuration & secrets

Convex splits configuration differently than a typical Next.js app: there is no client/server key split to manage manually, because **only Convex functions can see Convex-side env vars** — nothing server-only ever ships in the client bundle by construction.

| Var | Set where | Used by |
|---|---|---|
| `VITE_CONVEX_URL` | `.env.local` (client) | TanStack Start app → Convex client |
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env.local` (client) | Clerk React SDK |
| `CLERK_SECRET_KEY` | TanStack Start server env (for any server-function-side Clerk calls, e.g. admin user list) | Server-only |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex dashboard env vars | `convex/auth.config.ts` — validates the Clerk JWT |
| `CLERK_WEBHOOK_SECRET` | Convex dashboard env vars | `convex/http.ts` — verifies Clerk webhook signatures (Svix) |
| `RESEND_API_KEY` | Convex dashboard env vars | Payslip email delivery action |
| `RESEND_FROM_EMAIL` | Convex dashboard env vars | Sender address for payslip emails |

Convex dashboard env vars are the server-only tier here — equivalent to the Voice Notes spec's non-`EXPO_PUBLIC_*` keys. Nothing payroll-sensitive (bank details, wages) is ever computed or read in a TanStack Start server function; every read/write of that data goes through a Convex function so the same auth + RBAC check always applies, from any client.

---

## 5. Repository layout (target)

```
src/
  routes/                          # TanStack Router file-based routes
    __root.tsx                     # ClerkProvider, ConvexProviderWithClerk, ThemeProvider
    (auth)/
      sign-in.tsx
      sign-up.tsx
    _authed/                       # layout route — redirects if !isSignedIn, loads current user+role
      dashboard.tsx
      employees/
        index.tsx                  # List (Kanban | List toggle)
        $employeeId.tsx            # Employee form + smart buttons
      contracts/
        index.tsx
      attendance/
        index.tsx
      time-off/
        requests.tsx
        allocations.tsx
        types.tsx
      payroll/
        payruns/
          index.tsx
          new.tsx                  # 2-step wizard
          $payrunId.tsx             # payrun detail: compute/validate/mark paid/send
        payslips/
          index.tsx
          $payslipId.tsx
      configuration/
        working-schedules.tsx
        salary-structures.tsx
        salary-structures.$structureId.tsx   # ordered salary-rule builder
      settings.tsx                 # profile, role (admin-only view of others)
  components/
    ui/                            # shadcn primitives (button, card, table, dialog, sheet, form, badge, tabs, chart...)
    data-table/                    # shared DataTable + column-def helpers
    employees/                     # EmployeeCard, SmartButtons, EmployeeForm
    contracts/                     # ContractTimeline, ContractForm
    attendance/                    # AttendanceTable, CorrectionDialog
    time-off/                      # RequestForm, AllocationBar, ApprovalActions
    payroll/                       # PayrunWizard, PayslipView, ValidationPanel, SalaryRuleBuilder
    dashboard/                     # KpiCard, DepartmentBreakdownChart, SalaryTrendChart
  lib/
    status-colors.ts
    permissions.ts                 # client-side "can I see this button" helpers (mirrors convex/lib/rbac.ts — server is source of truth)
    utils.ts
  hooks/
    use-current-user.ts            # wraps a Convex query for { role, employeeId }
convex/
  schema.ts
  auth.config.ts
  http.ts                          # Clerk webhook receiver
  lib/
    rbac.ts                        # requireRole(ctx, [...roles]) helper, thrown ConvexError on failure
    payroll-engine.ts              # pure functions: selectApplicableContract, computeWorkingHours, runSalaryRules, validatePayslip
  users.ts                         # internal mutations synced from the Clerk webhook; getCurrentUser query
  departments.ts
  employees.ts
  contracts.ts
  workingSchedules.ts
  attendance.ts
  timeOff.ts                       # types, allocations, requests + the approval→allocation-consumption mutation
  salaryStructures.ts
  salaryRules.ts
  payruns.ts                       # createPayrun, compute, validate, markPaid, sendPayslips (action)
  payslips.ts
  pdf.ts                           # action: renderPayslipPdf(payslipId) -> storageId
  dashboard.ts                     # aggregate queries for KPIs/charts
  crons.ts                         # e.g. nightly contract-status housekeeping (mark expired contracts)
```

---

## 6. Auth & RBAC design

**Roles** (mirrors the source spec exactly): `employee`, `hr_manager`, `hr_payroll_user`, `hr_payroll_manager`, `admin`.

**Where the role lives:** Clerk `publicMetadata.role` is the *editable* copy (Admin screen writes it via a server function calling the Clerk Backend SDK), but the **source of truth Convex reads at request time is the mirrored `users` table**, kept in sync by a Clerk webhook:

```
Clerk user.created / user.updated
        ↓ (svix-signed webhook)
convex/http.ts  →  internal.users.syncFromClerk
        ↓
users table: { clerkId, email, role, employeeId }
```

Every Convex function that mutates or reads sensitive data starts with:

```ts
// convex/lib/rbac.ts
export async function requireRole(ctx: QueryCtx | MutationCtx, allowed: Role[]) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user || !allowed.includes(user.role)) throw new ConvexError("Forbidden");
  return user;
}
```

**Permission matrix** (from the source spec, unchanged):

| Capability | Employee | HR Manager | HR Payroll User | HR Payroll Manager | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| View own profile / attendance / leave balance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create own attendance / time-off request | ✅ | ✅ | ✅ | ✅ | ✅ |
| CRUD any Employee / Contract / Schedule | ❌ | ✅ | ✅ | ✅ | ✅ |
| Approve/Refuse Time Off | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create/Read/Update Payrun & Payslip | ❌ | ❌ | ✅ | ✅ | ✅ |
| Read Salary Structures/Rules | ❌ | ❌ | ✅ (read-only) | ✅ | ✅ |
| CRUD Salary Structures/Rules | ❌ | ❌ | ❌ | ✅ | ✅ |
| User/role management | ❌ | ❌ | ❌ | ❌ | ✅ |

An Employee's own record links via `users.employeeId`; every "own data" query filters `.eq("employeeId", user.employeeId)` rather than trusting a client-supplied id — the client never gets to ask for someone else's payslip by guessing an id.

---

## 7. Data model (Convex schema)

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("employee"),
      v.literal("hr_manager"),
      v.literal("hr_payroll_user"),
      v.literal("hr_payroll_manager"),
      v.literal("admin"),
    ),
    employeeId: v.optional(v.id("employees")),
  }).index("by_clerkId", ["clerkId"]),

  departments: defineTable({ name: v.string() }),

  employees: defineTable({
    name: v.string(),
    email: v.string(),
    departmentId: v.id("departments"),
    managerId: v.optional(v.id("employees")),
    jobPosition: v.string(),
    scheduleId: v.optional(v.id("workingSchedules")),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("terminated")),
    employeeType: v.union(v.literal("full_time"), v.literal("part_time"), v.literal("contract")),
    bankDetails: v.optional(
      v.object({ accountName: v.string(), accountNumber: v.string(), ifsc: v.string() }),
    ),
  })
    .index("by_department", ["departmentId"])
    .index("by_manager", ["managerId"])
    .index("by_status", ["status"]),

  contracts: defineTable({
    employeeId: v.id("employees"),
    startDate: v.number(),
    endDate: v.optional(v.number()), // open-ended if absent
    wage: v.number(),
    departmentId: v.id("departments"),
    position: v.string(),
    salaryStructureId: v.id("salaryStructures"),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("expired"), v.literal("cancelled")),
  }).index("by_employee_start", ["employeeId", "startDate"]),

  workingSchedules: defineTable({
    name: v.string(),
    weeklyHours: v.number(), // cached, derived from scheduleDays on write
  }),

  scheduleDays: defineTable({
    scheduleId: v.id("workingSchedules"),
    dayOfWeek: v.number(), // 0=Sun .. 6=Sat
    startTime: v.string(), // "09:00"
    endTime: v.string(),
    breakMinutes: v.number(),
  }).index("by_schedule", ["scheduleId"]),

  attendance: defineTable({
    employeeId: v.id("employees"),
    date: v.string(), // "2026-08-01", one row per employee per day
    checkIn: v.optional(v.number()),
    checkOut: v.optional(v.number()),
    workedMinutes: v.optional(v.number()),
    status: v.union(
      v.literal("present"),
      v.literal("late"),
      v.literal("absent"),
      v.literal("exception"),
      v.literal("overtime"),
    ),
    correctedBy: v.optional(v.id("users")),
  }).index("by_employee_date", ["employeeId", "date"]),

  timeOffTypes: defineTable({
    name: v.string(),
    unit: v.union(v.literal("days"), v.literal("hours")),
    allocationRequired: v.boolean(),
    requiresApproval: v.boolean(),
    affectsPayroll: v.boolean(),
  }),

  timeOffAllocations: defineTable({
    employeeId: v.id("employees"),
    timeOffTypeId: v.id("timeOffTypes"),
    allocatedAmount: v.number(),
    takenAmount: v.number(),
    validFrom: v.number(),
    validTo: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("expired")),
  }).index("by_employee_type", ["employeeId", "timeOffTypeId"]),

  timeOffRequests: defineTable({
    employeeId: v.id("employees"),
    timeOffTypeId: v.id("timeOffTypes"),
    startDate: v.number(),
    endDate: v.number(),
    duration: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("refused")),
    approvedBy: v.optional(v.id("users")),
    allocationId: v.optional(v.id("timeOffAllocations")),
  })
    .index("by_employee", ["employeeId"])
    .index("by_status", ["status"]),

  salaryStructures: defineTable({ name: v.string(), active: v.boolean() }),

  salaryRules: defineTable({
    structureId: v.id("salaryStructures"),
    name: v.string(),
    code: v.string(), // e.g. "BASIC", "HRA", "PF" — referenced by other rules' formulas
    category: v.union(
      v.literal("basic"),
      v.literal("allowance"),
      v.literal("gross"),
      v.literal("deduction"),
      v.literal("net"),
    ),
    sequence: v.number(),
    computationType: v.union(v.literal("fixed"), v.literal("percentage"), v.literal("formula")),
    amount: v.optional(v.number()), // fixed
    percentageOf: v.optional(v.string()), // code this % is taken of, for "percentage" type
    percentage: v.optional(v.number()),
    formula: v.optional(v.string()), // e.g. "BASIC + HRA + ALLOWANCE" for "formula" type — safe mini-parser, see §8.4
  }).index("by_structure_sequence", ["structureId", "sequence"]),

  payruns: defineTable({
    name: v.string(),
    salaryStructureId: v.id("salaryStructures"),
    periodStart: v.number(),
    periodEnd: v.number(),
    status: v.union(v.literal("draft"), v.literal("computed"), v.literal("validated"), v.literal("paid")),
    employeeIds: v.array(v.id("employees")), // explicit selection from wizard step 2
    createdBy: v.id("users"),
  }).index("by_period", ["periodStart", "periodEnd"]),

  payslips: defineTable({
    payrunId: v.id("payruns"),
    employeeId: v.id("employees"),
    contractId: v.id("contracts"),
    salaryStructureId: v.id("salaryStructures"),
    workedDays: v.number(),
    gross: v.number(),
    deductions: v.number(),
    net: v.number(),
    status: v.union(v.literal("draft"), v.literal("computed"), v.literal("validated"), v.literal("paid")),
    warnings: v.array(v.string()),
    pdfStorageId: v.optional(v.id("_storage")),
  })
    .index("by_payrun", ["payrunId"])
    .index("by_employee", ["employeeId"]),

  payslipLines: defineTable({
    payslipId: v.id("payslips"),
    salaryRuleId: v.id("salaryRules"),
    code: v.string(),
    name: v.string(),
    category: v.string(),
    amount: v.number(),
    sequence: v.number(),
  }).index("by_payslip", ["payslipId"]),
});
```

Notes vs. the source spec's suggested model: `contracts` keeps `endDate` optional to represent an open-ended active contract; `payruns.employeeIds` is stored explicitly (array of ids) so the wizard's Step-2 selection is the literal source of truth for "who is in this batch" rather than re-deriving eligibility later.

---

## 8. Core business logic (the actual hackathon-grading criteria)

These four algorithms are what the source spec calls out as "technically interesting" — they are implemented as **pure, unit-testable functions in `convex/lib/payroll-engine.ts`**, called from mutations/actions. None of this is hardcoded or faked.

### 8.1 Period-based contract selection

```ts
export function selectApplicableContract(
  contracts: Doc<"contracts">[],
  periodStart: number,
  periodEnd: number,
): Doc<"contracts"> | null {
  const candidates = contracts.filter(
    (c) =>
      c.status === "active" &&
      c.startDate <= periodEnd &&
      (c.endDate === undefined || c.endDate >= periodStart),
  );
  if (candidates.length === 0) return null;
  // if multiple overlap (shouldn't under valid data), the most recently started wins
  return candidates.sort((a, b) => b.startDate - a.startDate)[0];
}
```

Contract creation/update (`convex/contracts.ts`) itself rejects a new **active** contract whose date range overlaps another **active** contract for the same employee — enforced in the mutation, not just at payroll time.

### 8.2 Working-hours calculation

```ts
export function computeWeeklyHours(days: Doc<"scheduleDays">[]): number {
  return days.reduce((total, d) => {
    const minutes = diffMinutes(d.startTime, d.endTime) - d.breakMinutes;
    return total + minutes / 60;
  }, 0);
}
```

Recomputed and cached on `workingSchedules.weeklyHours` whenever `scheduleDays` change for that schedule — never hand-entered.

### 8.3 Leave balance logic

On `timeOffRequests` approval (`convex/timeOff.ts :: approveRequest` mutation):

```ts
// inside a mutation — atomic by construction (single Convex transaction)
if (timeOffType.allocationRequired) {
  const allocation = await findActiveAllocation(ctx, request.employeeId, request.timeOffTypeId);
  if (!allocation || allocation.allocatedAmount - allocation.takenAmount < request.duration) {
    throw new ConvexError("Insufficient leave balance");
  }
  await ctx.db.patch(allocation._id, { takenAmount: allocation.takenAmount + request.duration });
}
await ctx.db.patch(request._id, { status: "approved", approvedBy: user._id, allocationId: allocation?._id });
```

A **pending** request never touches `takenAmount` — only `approveRequest` does, and it's a single mutation so the allocation update and the status flip are atomic (no partial-approval race).

### 8.4 Salary rule engine (sequencing)

Rules execute strictly in `sequence` order within a structure; each rule's result is kept in a running `values: Record<code, number>` map so later rules can reference earlier ones:

```ts
export function runSalaryRules(
  rules: Doc<"salaryRules">[], // pre-sorted by sequence
  base: { wage: number },
): { lines: PayslipLine[]; gross: number; deductions: number; net: number } {
  const values: Record<string, number> = { BASIC: base.wage };
  const lines: PayslipLine[] = [];

  for (const rule of rules) {
    let amount: number;
    switch (rule.computationType) {
      case "fixed":
        amount = rule.amount ?? 0;
        break;
      case "percentage":
        amount = ((values[rule.percentageOf!] ?? 0) * (rule.percentage ?? 0)) / 100;
        break;
      case "formula":
        amount = evaluateFormula(rule.formula!, values); // whitelisted +,-,*,/ and known codes only — never eval()
        break;
    }
    values[rule.code] = amount;
    lines.push({ code: rule.code, name: rule.name, category: rule.category, amount, sequence: rule.sequence });
  }

  const gross = values["GROSS"] ?? sumCategory(lines, ["basic", "allowance"]);
  const deductions = sumCategory(lines, ["deduction"]);
  const net = values["NET"] ?? gross - deductions;
  return { lines, gross, deductions, net };
}
```

`evaluateFormula` is a small hand-rolled tokenizer over `+ - * / ( )` and known rule codes — **never `eval()`/`new Function()`** on user-authored formula strings, since Salary Rules are HR-Payroll-Manager-authored config, not fully trusted input.

### 8.5 Payroll validation

Run by `payruns.validate` before the Payrun can move to `validated`:

```ts
const warnings: string[] = [];
if (!contract) warnings.push("Missing applicable contract");
if (!employee.bankDetails) warnings.push("Missing bank details");
if (await hasDuplicatePayslip(ctx, payrun._id, employee._id)) warnings.push("Duplicate payslip");
if (payslip.net < 0) warnings.push("Calculation problem: negative net salary");
```

Warnings are stored on the payslip (`warnings: string[]`) and surfaced in the UI per-employee (✅ / ⚠ list, matching the source spec's demo screen) — the Payrun cannot move to `paid` while any payslip has unresolved warnings; HR/Payroll fixes the underlying data and re-runs `validate`.

---

## 9. Stages

Each stage is a shippable unit — the app should demo end-to-end at the close of every stage.

### Stage 0 — Baseline & scaffolding
- `bunx create-tsstart@latest` (or manual TanStack Start scaffold) + Tailwind v4 + `bunx shadcn@latest init`.
- `npx convex dev` to scaffold `convex/`, wire `ConvexProviderWithClerk` in `__root.tsx`.
- Add `convex/schema.ts` from §7 (all tables, no data yet).
- Seed script (`convex/seed.ts`, dev-only internal mutation) — 1 department, 1 working schedule, 1 salary structure with 5 rules, 3 employees — so every later stage has something to point the UI at immediately.
- **Done when:** `bun dev` boots an empty authed shell; `npx convex dashboard` shows the schema with seeded rows.

### Stage 1 — Design system & navigation shell
- Install shadcn components: button, card, table, dialog, sheet, form, badge, tabs, avatar, dropdown-menu, chart, calendar, command.
- `lib/status-colors.ts` single source of truth for every status badge color.
- Sidebar nav matching §15 of the source spec: Dashboard / Employees / Contracts / Attendance / Time Off / Payroll / Configuration / Reports.
- Dark mode toggle.
- **Done when:** the shell is screenshot-ready with seeded placeholder data in every nav section, light and dark.

### Stage 2 — Auth + RBAC
- Clerk sign-in/up, `_authed` layout route redirect.
- Clerk webhook → `convex/http.ts` → `users.syncFromClerk` internal mutation.
- Admin-only "Users & Roles" screen to assign `publicMetadata.role` (writes through a TanStack Start server function calling Clerk's Backend SDK, then relies on the webhook round-trip — or optimistically calls `users.setRole` directly for instant UI feedback).
- `requireRole()` wired into every existing Convex function stubbed so far.
- **Done when:** signing in as each of the 5 seeded role-users shows a visibly different nav/action set, and hitting a disallowed Convex mutation from the console throws `Forbidden`.

### Stage 3 — Employees, Departments, Contracts
- Employee List (table) + Kanban-by-status view; Employee form with smart-button counts (Contracts/Attendance/Time Off/Allocations) linking to filtered views.
- Contract CRUD with the overlap-rejection rule from §8.1; contract list flags the currently-active one.
- **Done when:** creating Contract B for an employee whose Contract A is still "active" and date-overlapping is rejected with a clear error; the applicable-contract selector (usable ad hoc from any employee page) correctly picks the right one for a chosen period.

### Stage 4 — Working Schedules & Attendance
- Working Schedule builder (`scheduleDays` grid, Mon–Sun start/end/break) with live weekly-hours computation (§8.2).
- Attendance list (global + employee-scoped) with manual check-in/out entry and HR correction dialog.
- **Done when:** building a Mon–Fri 09:00–18:00/1h-break schedule shows "40 hrs/week" without manual entry, and attendance rows show computed `workedMinutes` + status.

### Stage 5 — Time Off (Types, Allocations, Requests)
- Time Off Type config (unit, allocation-required, approval-required, affects-payroll).
- Allocation CRUD + employee-facing balance view.
- Request form (employee) → Pending → HR Approve/Refuse, wired to §8.3's atomic consumption mutation.
- **Done when:** approving a 3-day request against a 15-day allocation flips the balance to 12 in the same click, visible immediately (Convex reactivity — no manual refetch).

### Stage 6 — Salary Structures & the Rule Engine
- Salary Structure list; Salary Rule builder — add/reorder (drag handle → rewrites `sequence`) rules of each computation type, with a live preview panel that runs §8.4 against a sample wage.
- **Done when:** editing HRA from 40%→45% of Basic in the builder changes the live preview's Gross/Net instantly, with zero hardcoded numbers anywhere in the UI layer.

### Stage 7 — Payrun & Payslip processing
- Payrun creation wizard (Step 1: structure + period, no row created yet → Step 2: eligible-employee checklist → `createPayrun`).
- Payrun detail: Compute (runs §8.1 + §8.4 per selected employee → payslips + payslipLines), Validate (§8.5, shows ✅/⚠ per employee), Mark Paid (blocked while warnings remain).
- Payslip detail view matching the source spec's earnings/deductions/net layout.
- **Done when:** Scenario 1 from the source spec's five-minute demo runs start to finish: create employee → contract → schedule → attendance → payrun → compute → warnings → fix → validate → mark paid.

### Stage 8 — PDF & bulk email delivery
- `convex/pdf.ts :: renderPayslipPdf` action using `@react-pdf/renderer`, storing the result via `ctx.storage.store()` and patching `payslips.pdfStorageId`.
- "Print Payslip" button (per payslip) + "Send Payslips" button (per payrun) → action loops selected employees, generates/reuses each PDF, emails via Resend.
- **Done when:** a full Payrun can be marked Paid and "Send Payslips" actually delivers (or, in dev, logs) one email per employee with their PDF attached/linked.

### Stage 9 — Dashboard & polish
- KPI cards (Total Net Salary Paid, Payslips Generated, Average Salary, Approved Time Off, Attendance Health) computed live from Convex aggregate queries — never mock numbers.
- Charts: Salary Cost by Department, Monthly Net Salary Trend.
- Department breakdown (headcount + salary cost), alerts list (warning counts pulled from real unresolved payslip warnings).
- Search/filter polish across all list screens; loading/empty/error states audited everywhere.
- **Done when:** the dashboard's numbers visibly move after running Scenario 1/2 from the source spec — it's provably wired to real data, not a static screenshot.

---

## 10. Cross-cutting requirements

- **No hardcoded payroll output.** If a Payslip's numbers could be produced by a static template instead of the rule engine, that's a failed implementation — see §8.4.
- **Error UX:** every async surface (query loading, mutation pending, action in flight) has loading / empty / error states — Convex's `useQuery` returning `undefined` is the loading state; design for it explicitly, never render a blank table.
- **Historical integrity:** a `paid` Payrun and its Payslips are never mutated again by later schema changes to Salary Rules — Payslip Lines are a frozen snapshot (`salaryRuleId` reference + copied `amount`), not a live join.
- **Validation before finalization**, always — `markPaid` mutation itself re-checks for unresolved warnings server-side, not just client-side gating (a client-only check is not a real guarantee).
- **Accessibility:** every icon-only button has an aria-label, all forms are keyboard-navigable, focus rings use `--primary`.
- **Testing posture:** for a portfolio/hackathon build, prioritize `convex-test` unit tests on the four §8 pure functions (contract selection, hours calc, leave balance, rule engine) over UI tests — this is where the actual grading/interview-defensibility lives.

---

## 11. Suggested build order & dependencies

```
Stage 0 → 1 → 2 (Auth/RBAC) → 3 (Employee/Contract) → 4 (Schedule/Attendance)
   → 5 (Time Off) → 6 (Salary Rules) → 7 (Payrun/Payslip) → 8 (PDF/Email) → 9 (Dashboard/polish)
```

Hard-ordered: Payrun (7) needs Contracts (3), Schedules (4), and Salary Rules (6) to exist first. Dashboard (9) needs real Payrun/Payslip/Attendance/Time-Off data to aggregate, so it's deliberately last even though it's visually the "front door."

---

## 12. Open questions to resolve before Stage 2

1. **Clerk role source of truth**: keep `publicMetadata.role` as the editable copy with a webhook mirror into `users` (as specified in §6), or skip Clerk metadata entirely and make `users.role` the only copy, edited directly via a Convex mutation from the Admin screen? The webhook approach is more "production-shaped" but adds a moving part for a portfolio project.
2. **Multi-currency**: the source spec is India-flavored (₹). Confirm whether this stays hardcoded to INR or needs a `currency` field on `salaryStructures` for portfolio flexibility toward EU roles.
3. **PDF library choice**: `@react-pdf/renderer` (React-based, runs fine in a Convex Node action) vs. a headless-Chromium approach — the latter needs a separate hosted render step Convex actions can't easily provide; default to `@react-pdf/renderer` unless a specific payslip layout requires HTML/CSS fidelity.
4. **Email provider**: Resend direct SDK call vs. the official `@convex-dev/resend` Convex Component (adds queuing/retries/idempotency for free) — confirm the Component is stable enough to depend on before Stage 8.
5. **Attendance capture**: manual entry only (as scoped for the demo) vs. a lightweight check-in button with device time — affects whether `attendance.checkIn/checkOut` are ever client-supplied timestamps (a trust boundary question, since Convex would otherwise take the client's word for "when").
6. **Working-schedule variability**: are schedules ever per-contract (as the source spec's data model allows, `contracts` doesn't reference a schedule directly but `employees` does) or always per-employee? Decide before building the Schedule assignment UI in Stage 4.
