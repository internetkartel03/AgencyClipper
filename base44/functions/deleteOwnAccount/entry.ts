import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const OWNED_ENTITIES = [
  "DailyObjective",
  "IdeationMessage",
  "IdeationThread",
  "ThumbnailMessage",
  "ThumbnailSession",
];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body?.confirmation !== "DELETE") {
      return Response.json(
        { error: "Type DELETE to confirm account deletion." },
        { status: 400 },
      );
    }

    if (user.role === "admin") {
      const admins = await base44.asServiceRole.entities.User.filter({
        role: "admin",
      });
      if (admins.length <= 1) {
        return Response.json(
          {
            error:
              "The last administrator cannot delete their account. Invite and promote another administrator first.",
          },
          { status: 409 },
        );
      }
    }

    for (const entityName of OWNED_ENTITIES) {
      const rows = await base44.asServiceRole.entities[entityName].filter({
        created_by: user.email,
      });
      for (const row of rows) {
        await base44.asServiceRole.entities[entityName].delete(row.id);
      }
    }

    await base44.asServiceRole.entities.User.delete(user.id);
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("deleteOwnAccount failed", error);
    return Response.json(
      { error: "Account deletion failed. Please try again." },
      { status: 500 },
    );
  }
}
