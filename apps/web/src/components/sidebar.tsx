import { UserButton } from "@clerk/tanstack-react-start";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Home,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import { useCurrentUser } from "../lib/current-user";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", to: "/dashboard" },
  { icon: Users, label: "Employees", to: "/employees" },
  { icon: BookOpen, label: "Contracts", to: "/contracts" },
  { icon: Clock, label: "Attendance", to: "/attendance" }, // Time Off has a sub-nav below, no top-level link needed
  { icon: DollarSign, label: "Payroll", to: "/payroll/payruns" },
  { icon: BarChart3, label: "Reports", to: "/reports" },
] as const;

export function Sidebar() {
  const {
    location: { pathname },
  } = useRouterState();
  const currentUser = useCurrentUser();

  const isAdmin = currentUser?.role === "admin";
  const canViewPayroll = [
    "admin",
    "hr_payroll_manager",
    "hr_payroll_user",
  ].includes(currentUser?.role ?? "");

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-border border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center justify-between border-border border-b px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <DollarSign aria-hidden="true" className="size-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground text-sm tracking-tight">
              PeoplePay360
            </span>
            <span className="block font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
              Enterprise HR
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
            const isPayrollNav = to === "/payroll/payruns";

            const active = pathname === to || pathname.startsWith(`${to}/`);

            if (isPayrollNav && !canViewPayroll) {
              return null;
            }

            return (
              <li key={to}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex h-9 items-center gap-3 rounded-md px-3 text-xs transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary shadow-2xs"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                  to={to}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}

          {/* Time Off Sub-Nav */}
          <li className="mt-2">
            <div className="flex h-9 items-center gap-3 rounded-md px-3 text-xs transition-colors">
              <Calendar
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                Time Off
              </span>
            </div>
            <ul className="mt-0.5 ml-4 flex flex-col gap-0.5 border-border border-l pl-3">
              <li>
                <Link
                  aria-current={
                    pathname === "/time-off" &&
                    !pathname.startsWith("/time-off/")
                      ? "page"
                      : undefined
                  }
                  className={[
                    "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors",
                    pathname === "/time-off" &&
                    !pathname.startsWith("/time-off/")
                      ? "bg-primary/10 font-medium text-primary shadow-2xs"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                  to="/time-off"
                >
                  <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  aria-current={
                    pathname.startsWith("/time-off/requests")
                      ? "page"
                      : undefined
                  }
                  className={[
                    "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors",
                    pathname.startsWith("/time-off/requests")
                      ? "bg-primary/10 font-medium text-primary shadow-2xs"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                  to="/time-off/requests"
                >
                  <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>Requests</span>
                </Link>
              </li>
              <li>
                <Link
                  aria-current={
                    pathname === "/time-off/allocations" ? "page" : undefined
                  }
                  className={[
                    "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors",
                    pathname === "/time-off/allocations"
                      ? "bg-primary/10 font-medium text-primary shadow-2xs"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                  to="/time-off/allocations"
                >
                  <Tags aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>Allocations</span>
                </Link>
              </li>
              {currentUser?.role !== "employee" && (
                <li>
                  <Link
                    aria-current={
                      pathname === "/time-off/types" ? "page" : undefined
                    }
                    className={[
                      "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors",
                      pathname === "/time-off/types"
                        ? "bg-primary/10 font-medium text-primary shadow-2xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    ].join(" ")}
                    to="/time-off/types"
                  >
                    <Tags aria-hidden="true" className="size-3.5 shrink-0" />
                    <span>Types</span>
                  </Link>
                </li>
              )}
            </ul>
          </li>

          {/* Configuration Sub-Nav */}
          {(() => {
            const canViewConfiguration = currentUser?.role !== "employee";
            if (!canViewConfiguration) {
              return null;
            }

            return (
              <li className="mt-2">
                <div className="flex h-9 items-center gap-3 rounded-md px-3 text-xs transition-colors">
                  <Settings
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Configuration
                  </span>
                </div>
                <ul className="mt-0.5 ml-4 flex flex-col gap-0.5 border-border border-l pl-3">
                  <li>
                    <Link
                      aria-current={
                        pathname === "/configuration/departments"
                          ? "page"
                          : undefined
                      }
                      className={[
                        "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors",
                        pathname === "/configuration/departments"
                          ? "bg-primary/10 font-medium text-primary shadow-2xs"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      ].join(" ")}
                      to="/configuration/departments"
                    >
                      <Building2
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                      <span>Departments</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      aria-current={
                        pathname === "/configuration/working-schedules"
                          ? "page"
                          : undefined
                      }
                      className={[
                        "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors",
                        pathname === "/configuration/working-schedules"
                          ? "bg-primary/10 font-medium text-primary shadow-2xs"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      ].join(" ")}
                      to="/configuration/working-schedules"
                    >
                      <Calendar
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                      <span>Working Schedules</span>
                    </Link>
                  </li>
                  {["admin", "hr_payroll_manager", "hr_payroll_user"].includes(
                    currentUser?.role ?? ""
                  ) && (
                    <li>
                      <Link
                        aria-current={
                          pathname === "/configuration/salary-structures"
                            ? "page"
                            : undefined
                        }
                        className={[
                          "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors",
                          pathname === "/configuration/salary-structures"
                            ? "bg-primary/10 font-medium text-primary shadow-2xs"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        ].join(" ")}
                        to="/configuration/salary-structures"
                      >
                        <DollarSign
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        <span>Salary Structures</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
            );
          })()}
        </ul>
      </nav>

      {/* Footer: User Profile & theme toggle */}
      <div className="flex flex-col gap-2 border-border border-t bg-muted/20 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <UserButton />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground text-xs">
                {currentUser?.email || "Signed In"}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-xs bg-primary/10 px-1.5 py-0.5 font-semibold text-[10px] text-primary uppercase tracking-wider">
                  {currentUser?.role?.replace("_", " ") || "Loading..."}
                </span>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
