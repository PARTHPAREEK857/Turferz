import { ApiError, readJsonBody, route } from "@/server/http";
import { teamRegistrationSchema } from "@/lib/validation";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { registerTeam } from "@/server/services/tournaments";

export const dynamic = "force-dynamic";

/** POST /api/tournaments/[slug]/register — register a team. */
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, ctx) => {
  const { slug } = await ctx.params;
  const user = await getSessionUserFromRequest(req);
  if (!user) throw ApiError.unauthorized("Sign in to register your team");
  const input = await readJsonBody(req, teamRegistrationSchema);
  const registration = registerTeam({ user, tournamentSlug: slug, ...input });
  return Response.json({ registration }, { status: 201 });
});
