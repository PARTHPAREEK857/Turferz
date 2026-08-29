import { readJsonBody, route } from "@/server/http";
import { registerSchema } from "@/lib/validation";
import { registerAccount } from "@/server/services/auth";
import { sessionCookie, signSessionToken } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** POST /api/auth/register — create an account and sign in. */
export const POST = route(async (req) => {
  const input = await readJsonBody(req, registerSchema);
  const user = await registerAccount(input);
  const token = await signSessionToken(user.id);
  return Response.json(
    { user },
    { status: 201, headers: { "Set-Cookie": sessionCookie(token) } },
  );
});
