import type { SessionUser } from "@/lib/types";
import { cookies } from "next/headers";
import { findOneById } from "../repositories/users";
import { SESSION_COOKIE } from "@/lib/constants";
import { parseCookies, verifySessionToken } from "../auth/session";

export { SESSION_COOKIE };

function toSessionUser(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "USER" | "ADMIN";
}): SessionUser {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
}

async function userFromToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  const row = findOneById(userId);
  return row ? toSessionUser(row) : null;
}

/** Resolve the signed-in user from an incoming API Request (cookie header). */
export async function getSessionUserFromRequest(req: Request): Promise<SessionUser | null> {
  const jar = parseCookies(req.headers.get("cookie"));
  return userFromToken(jar[SESSION_COOKIE]);
}

/** Resolve the signed-in user inside React server components. */
export async function getServerSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return userFromToken(store.get(SESSION_COOKIE)?.value);
}
