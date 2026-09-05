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
    <div className="flex min-h-svh items-center justify-center p-6">
      <SignIn routing="path" signUpUrl="/sign-up" />
    </div>
  );
}
