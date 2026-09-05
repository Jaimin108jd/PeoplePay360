import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

export interface CreateClerkUserInput {
  email: string;
  password?: string;
  role: string;
}

export interface DeleteClerkUserInput {
  clerkId: string;
}

export interface UpdateClerkRoleInput {
  clerkId: string;
  role: string;
}

function getClerkErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  const candidate = error as {
    errors?: Array<{
      longMessage?: string;
      message?: string;
      code?: string;
      meta?: { paramName?: string };
    }>;
    longMessage?: string;
    message?: string;
  };

  const details = candidate.errors
    ?.map((item) => {
      const field = item.meta?.paramName ? `${item.meta.paramName}: ` : "";
      return `${field}${item.longMessage || item.message || item.code || ""}`;
    })
    .filter(Boolean);

  return details?.length
    ? details.join(" ")
    : candidate.longMessage || candidate.message || JSON.stringify(error);
}

export const adminCreateClerkUserFn = createServerFn({ method: "POST" })
  .validator((data: CreateClerkUserInput) => data)
  .handler(async ({ data }) => {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized — you must be signed in to create users.");
    }

    const client = clerkClient();
    const email = data.email.trim().toLowerCase();
    if (!(email && email.includes("@"))) {
      throw new Error("Enter a valid email address.");
    }
    if (data.password && data.password.length !== 8) {
      throw new Error("Password must be exactly 8 characters long.");
    }

    const password =
      data.password ||
      `Aa2!${crypto.randomUUID().replaceAll("-", "").slice(0, 4)}`;

    try {
      const newUser = await client.users.createUser({
        emailAddress: [email],
        password,
        publicMetadata: {
          role: data.role,
        },
      });

      return {
        clerkId: newUser.id,
        email,
        generatedPassword: data.password ? undefined : password,
      };
    } catch (err: unknown) {
      // Clerk SDK throws Error objects with structured details
      const msg = getClerkErrorMessage(err);

      // Common Clerk error patterns
      if (
        msg.includes("duplicate") ||
        msg.includes("already exists") ||
        msg.includes("form_identifier_exists")
      ) {
        throw new Error(
          `A Clerk account with email "${email}" already exists.`
        );
      }
      if (msg.includes("password")) {
        throw new Error(`Password does not meet requirements: ${msg}`);
      }
      if (msg.includes("Unauthorized") || msg.includes("401")) {
        throw new Error(
          "Clerk API key is invalid or missing. Check CLERK_SECRET_KEY in Convex dashboard."
        );
      }
      if (msg.includes("Forbidden") || msg.includes("403")) {
        throw new Error(
          "Clerk API key does not have permission to create users."
        );
      }

      throw new Error(`Clerk user creation failed: ${msg}`);
    }
  });

export const adminDeleteClerkUserFn = createServerFn({ method: "POST" })
  .validator((data: DeleteClerkUserInput) => data)
  .handler(async ({ data }) => {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    if (data.clerkId === userId) {
      throw new Error("Cannot delete currently authenticated administrator");
    }

    const client = clerkClient();
    try {
      await client.users.deleteUser(data.clerkId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      throw new Error(`Failed to delete Clerk user: ${msg}`);
    }
    return { success: true };
  });

export const adminUpdateClerkRoleFn = createServerFn({ method: "POST" })
  .validator((data: UpdateClerkRoleInput) => data)
  .handler(async ({ data }) => {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const client = clerkClient();
    try {
      await client.users.updateUserMetadata(data.clerkId, {
        publicMetadata: {
          role: data.role,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      throw new Error(`Failed to update Clerk role: ${msg}`);
    }
    return { success: true };
  });
