import { ZodError, type ZodType } from "zod";
import type { NextRequest } from "next/server";

/** Error with an HTTP status, machine code, and optional per-field messages. */
export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  static unauthorized(message = "You need to sign in to do that"): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static notFound(message = "Not found"): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static badRequest(code: string, message: string, fieldErrors?: Record<string, string>): ApiError {
    return new ApiError(400, code, message, fieldErrors);
  }

  static conflict(code: string, message: string, fieldErrors?: Record<string, string>): ApiError {
    return new ApiError(409, code, message, fieldErrors);
  }
}


export function jsonError(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Please check the highlighted fields", fieldErrors: fieldErrorsOf(err) } },
      { status: 400 },
    );
  }
  console.error("[turferz] unhandled API error:", err);
  return Response.json(
    { error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}

export function fieldErrorsOf(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Wrap a route handler with uniform error handling. */
export function route<Ctx = unknown>(
  handler: (req: NextRequest, ctx: Ctx) => Promise<Response>,
): (req: NextRequest, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return jsonError(err);
    }
  };
}

/** Parse and validate a JSON request body with a Zod schema. */
export async function readJsonBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Expected a JSON request body");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Please check the highlighted fields", fieldErrorsOf(parsed.error));
  }
  return parsed.data;
}

/** Validate URL search params with a Zod schema. */
export function readQuery<T>(req: Request, schema: ZodType<T>): T {
  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (value !== "") obj[key] = value;
  }
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", fieldErrorsOf(parsed.error));
  }
  return parsed.data;
}
