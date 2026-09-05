import { api } from "@PeoplePay360/backend/convex/_generated/api";
import { useUser } from "@clerk/tanstack-react-start";
import { useQuery } from "convex/react";
import { createContext, useContext } from "react";

type CurrentUser = {
  _id: string;
  clerkId: string;
  email: string;
  role: string;
  employeeId?: string;
  [key: string]: unknown;
} | null | undefined;

const CurrentUserContext = createContext<CurrentUser>(undefined);

export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : "skip"
  );
  return (
    <CurrentUserContext.Provider value={currentUser}>
      {children}
    </CurrentUserContext.Provider>
  );
}

/** Returns the cached current-user record. `undefined` = loading, `null` = not found. */
export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
