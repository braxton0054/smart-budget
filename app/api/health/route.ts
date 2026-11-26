import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export async function GET() {
  await connection();
  const openwaUrl = process.env.OPENWA_URL ?? "http://127.0.0.1:2785";
  const [database, cache, whatsapp] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => "ok").catch(() => "error"),
    getRedis()
      .ping()
      .then(() => "ok")
      .catch(() => "error"),
    fetch(new URL("/api/health/ready", openwaUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    })
      .then((response) => (response.ok ? "ok" : "error"))
      .catch(() => "error"),
  ]);

  const healthy = database === "ok" && cache === "ok" && whatsapp === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", database, cache, whatsapp },
    { status: healthy ? 200 : 503 },
  );
}
