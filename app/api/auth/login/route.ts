import { readJsonBody, route } from "@/server/http";
import { loginSchema } from "@/lib/validation";
import { authenticate } from "@/server/services/auth";
import { sessionCookie, signSessionToken } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** POST /api/auth/login — sign in. */
export const POST = route(async (req) => {
  const input = await readJsonBody(req, loginSchema);
  const user = await authenticate(input);
  const token = await signSessionToken(user.id);
  return Response.json({ user }, { headers: { "Set-Cookie": sessionCookie(token) } });
});
