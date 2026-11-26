import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";

async function RouteByRole() {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = String((session.user as { role?: string }).role ?? "").toUpperCase();
  redirect(role === "SUPERADMIN" ? "/admin" : "/dashboard");
  return null;
}

export default function AfterSignInPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-nt-void" aria-busy="true" />}>
      <RouteByRole />
    </Suspense>
  );
}
