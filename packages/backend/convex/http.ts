import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  handler: httpAction(async (ctx, req) => {
    try {
      const payload = (await req.json()) as {
        type?: string;
        data?: {
          id?: string;
          email_addresses?: Array<{ email_address: string; id: string }>;
          primary_email_address_id?: string;
        };
      };

      const eventType = payload.type;
      const data = payload.data;

      if (!(eventType && data?.id)) {
        return new Response("Missing event details", { status: 400 });
      }

      if (eventType === "user.created" || eventType === "user.updated") {
        const primaryEmail =
          data.email_addresses?.find(
            (e) => e.id === data.primary_email_address_id
          )?.email_address ??
          data.email_addresses?.[0]?.email_address ??
          "";

        await ctx.runMutation(internal.users.syncFromClerk, {
          clerkId: data.id,
          email: primaryEmail,
        });
      } else if (eventType === "user.deleted") {
        await ctx.runMutation(internal.users.deleteUserByClerkId, {
          clerkId: data.id,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (err) {
      console.error("Webhook processing error:", err);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
  method: "POST",
  path: "/clerk-users-webhook",
});

export default http;
