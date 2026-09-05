import { api } from "@PeoplePay360/backend/convex/_generated/api";
import { useAuth, useUser } from "@clerk/tanstack-react-start";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

import { ErrorBoundary } from "../../components/error-boundary";
import { Sidebar } from "../../components/sidebar";
import { CurrentUserProvider } from "../../lib/current-user";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context }) => {
    if (!(context as any)?.userId) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: AuthedLayout,
});

function RedirectToSignIn() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/sign-in" });
  }, [navigate]);

  return (
    <div className="flex h-svh items-center justify-center">
      <div
        aria-label="Redirecting to sign-in"
        className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
      />
    </div>
  );
}

function UserSyncWrapper({ children }: { children: React.ReactNode }) {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();

  const ensureUser = useMutation(api.users.ensureUser);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!(isAuthLoaded && isUserLoaded && isSignedIn && user)) {
      return;
    }

    let cancelled = false;
    const clerkId = user.id;
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress ??
      "";

    ensureUser({ clerkId, email })
      .then(() => {
        if (!cancelled) {
          setIsSynced(true);
        }
      })
      .catch((err) => {
        console.error("Failed to sync user record to Convex:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [ensureUser, isAuthLoaded, isSignedIn, isUserLoaded, user]);

  if (!(isAuthLoaded && isUserLoaded && isSignedIn && isSynced)) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div
          aria-label="Synchronizing account"
          className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
        />
      </div>
    );
  }

  return <>{children}</>;
}

function AuthedLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div
          aria-label="Loading authentication..."
          className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <UserSyncWrapper>
      <CurrentUserProvider>
        <div className="flex h-svh overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </CurrentUserProvider>
    </UserSyncWrapper>
  );
}
