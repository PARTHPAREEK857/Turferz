import { route } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  try {
    const { getDb } = await import("@/server/db/client");
    getDb().prepare("SELECT 1").get();
    return Response.json({ status: "ok", database: "connected" });
  } catch (err) {
    return Response.json(
      { status: "error", message: (err as Error).message },
      { status: 500 },
    );
  }
});
