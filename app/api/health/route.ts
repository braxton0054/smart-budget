// Liveness probe used by Docker Compose and by the deploy workflow.
// Keep it dependency-free: a health check must not fail because a database or
// a payment provider is down, otherwise the proxy would pull a healthy app
// out of rotation during an unrelated outage.
// No route-segment config: `dynamic = "force-dynamic"` is rejected when
// nextConfig.cacheComponents is enabled (Next.js 16).
export async function GET() {
  return Response.json({ status: "ok" });
}
