import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if ((context as any)?.userId) {
      throw redirect({ to: "/dashboard" });
    }
    throw redirect({ to: "/sign-in" });
  },
  component: () => null,
});
