import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireSuperadmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = String((session.user as { role?: string }).role ?? "").toUpperCase();
  if (role !== "SUPERADMIN") redirect("/dashboard");
  return session;
}

/** Shop ownership check for route handlers. Returns a status code, never a shop of another owner. */
export async function ownedShopForApi(shopId: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: 401 as const };
  if (String((session.user as { role?: string }).role ?? "").toUpperCase() === "SUPERADMIN") {
    return { error: 403 as const };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { shops: { select: { id: true, name: true, slug: true } } },
  });
  const shop = user?.shops.find((item) => item.id === shopId);
  if (!shop) return { error: 404 as const };
  return { shop };
}
