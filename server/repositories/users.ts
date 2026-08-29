import { getDb, one } from "../db/client";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

interface RawUserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
}

function map(row: RawUserRow): UserRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    role: row.role === "ADMIN" ? "ADMIN" : "USER",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createUser(input: {
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role?: "USER" | "ADMIN";
}): UserRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    db
      .prepare(
        `INSERT INTO users (id, name, email, phone, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.name, input.email.toLowerCase(), input.phone, input.passwordHash, input.role ?? "USER", now, now);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("users.email")) {
      const dupe = { code: "EMAIL_TAKEN" as const, message: "An account with this email already exists" };
      throw Object.assign(new Error(dupe.message), dupe);
    }
    throw err;
  }
  return findOneById(id)!;
}

export function findOneByEmail(email: string): UserRow | undefined {
  const row = one<RawUserRow>(getDb(), "SELECT * FROM users WHERE email = ?", email.toLowerCase());
  return row ? map(row) : undefined;
}

export function findOneById(id: string): UserRow | undefined {
  const row = one<RawUserRow>(getDb(), "SELECT * FROM users WHERE id = ?", id);
  return row ? map(row) : undefined;
}

export function updateProfile(
  id: string,
  patch: { name?: string; phone?: string | null },
): UserRow | undefined {
  const db = getDb();
  const existing = findOneById(id);
  if (!existing) return undefined;
  db.prepare("UPDATE users SET name = ?, phone = ?, updated_at = ? WHERE id = ?").run(
    patch.name ?? existing.name,
    patch.phone === undefined ? existing.phone : patch.phone,
    new Date().toISOString(),
    id,
  );
  return findOneById(id);
}
