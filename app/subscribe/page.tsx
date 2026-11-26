import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth, signOut } from "@/auth";
import { canStartTrial, currentEntitlement } from "@/lib/billing/subscriptions";
import { prisma } from "@/lib/prisma";
import { ensureShopForUser } from "@/lib/shop-provisioning";
import { SubscribeFlow, type PlanView } from "./_components/subscribe-flow";
import type { SelectedPlan } from "./_components/form-types";

export const metadata: Metadata = { title: "Choose a plan" };

async function SubscribeContent({ searchParams }: { searchParams: Promise<{ pay?: string }> }) {
  await connection();
  const [{ pay }, session] = await Promise.all([searchParams, auth()]);
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
  if (!shopId) redirect("/login");

  const entitlement = await currentEntitlement(shopId);
  if (entitlement && !entitlement.isTrial && pay !== "1") redirect("/dashboard");

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      priceMonthly: true,
      maxProducts: true,
      maxMessages: true,
      maxSessions: true,
      tokenCap: true,
      graceDays: true,
    },
  });
  const planViews: PlanView[] = plans.map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    priceMonthly: plan.priceMonthly,
    maxProducts: plan.maxProducts,
    maxMessages: plan.maxMessages,
    maxSessions: plan.maxSessions,
    tokenCap: plan.tokenCap,
    graceDays: plan.graceDays,
  }));

  let initialPlan: SelectedPlan | null = null;
  if (pay === "1" && entitlement) {
    initialPlan = {
      id: entitlement.planId,
      code: entitlement.planCode,
      name: entitlement.planName,
      priceMonthly: entitlement.priceMonthly,
    };
  }

  return (
    <main className="min-h-dvh bg-nt-void px-5 py-8 text-nt-ink sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-nt-line pb-6">
          <div>
            <span className="font-display text-lg font-semibold tracking-[0.08em]">
              SMART<span className="text-nt-cyan">BUDGET</span>
            </span>
            <p className="mt-1 text-xs text-nt-muted">{email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="cursor-pointer rounded-lg border border-nt-line px-4 py-2 text-sm text-nt-muted transition-colors hover:border-nt-cyan/50 hover:text-nt-ink"
            >
              Sign out
            </button>
          </form>
        </header>

        <h1 className="mt-10 font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
          Choose how you want to sell
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nt-muted">
          Plans cap products, messages and LLM tokens so one shop cannot exhaust the platform.
        </p>

        <SubscribeFlow
          plans={planViews}
          entitlement={entitlement}
          canTrial={await canStartTrial(shopId)}
          initialPlan={initialPlan}
        />
      </div>
    </main>
  );
}

export default function SubscribePage(props: { searchParams: Promise<{ pay?: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-nt-void" aria-busy="true" />}>
      <SubscribeContent {...props} />
    </Suspense>
  );
}
