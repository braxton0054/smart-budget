import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { currentEntitlement } from "@/lib/billing/subscriptions";
import { prisma } from "@/lib/prisma";
import { ensureShopForUser } from "@/lib/shop-provisioning";

async function RouteByRole() {
  await connection();
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";
  if (!email) redirect("/login");
  const role = String(((session?.user as { role?: string } | undefined)?.role ?? "").toUpperCase());
  if (role === "SUPERADMIN") {
    redirect("/admin");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, shops: { select: { id: true }, take: 1 } },
  });
  if (!user) redirect("/login");

  let shopId: string | undefined = user.shops[0]?.id;
  if (!shopId) {
    const shop = await ensureShopForUser({ userId: user.id, email: user.email, name: user.name });
    shopId = shop?.id;
  }
  const entitled = shopId ? await currentEntitlement(shopId) : null;
  redirect(entitled ? "/dashboard" : "/subscribe");
  return null;
}

export default function AfterSignInPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-nt-void" aria-busy="true" />}>
      <RouteByRole />
    </Suspense>
  );
}
