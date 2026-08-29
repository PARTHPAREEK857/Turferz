import { ApiError } from "../http";
import type { SessionUser } from "@/lib/types";
import { hashPassword, verifyPassword } from "../auth/password";
import {
  createUser,
  findOneByEmail,
  findOneById,
  updateProfile,
  type UserRow,
} from "../repositories/users";

function toSessionUser(row: UserRow): SessionUser {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
}

export async function registerAccount(input: {
  name: string;
  email: string;
  phone: string | null;
  password: string;
}): Promise<SessionUser> {
  const passwordHash = await hashPassword(input.password);
  const user = createUser({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
  });
  return toSessionUser(user);
}

export async function authenticate(input: {
  email: string;
  password: string;
}): Promise<SessionUser> {
  const row = findOneByEmail(input.email);
  if (!row) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
  }
  const ok = await verifyPassword(input.password, row.passwordHash);
  if (!ok) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
  }
  return toSessionUser(row);
}

export function getUserById(id: string): SessionUser | null {
  const row = findOneById(id);
  return row ? toSessionUser(row) : null;
}

export function updateMyProfile(
  userId: string,
  patch: { name?: string; phone?: string | null },
): SessionUser {
  const updated = updateProfile(userId, patch);
  if (!updated) throw ApiError.notFound("Account not found");
  return toSessionUser(updated);
}
