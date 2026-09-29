import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const has = (name: string) => Boolean(Deno.env.get(name));
  return Response.json({
    AI_PROVIDER: { state: "connected", label: "Built in" },
    CLOUDFLARE: {
      state:
        has("CLOUDFLARE_ACCOUNT_ID") && has("CLOUDFLARE_API_TOKEN")
          ? "connected"
          : "missing",
      label:
        has("CLOUDFLARE_ACCOUNT_ID") && has("CLOUDFLARE_API_TOKEN")
          ? "Connected"
          : "Not configured",
    },
    YOUTUBE: {
      state: has("YOUTUBE_API_KEY") ? "connected" : "missing",
      label: has("YOUTUBE_API_KEY") ? "Configured" : "Not configured",
    },
    DISCORD: {
      state: has("DISCORD_BOT_TOKEN") ? "connected" : "missing",
      label: has("DISCORD_BOT_TOKEN") ? "Configured" : "Not configured",
    },
    NOTION: {
      state: has("NOTION_TOKEN") ? "connected" : "available",
      label: has("NOTION_TOKEN") ? "Configured" : "Connector available",
    },
  });
}
