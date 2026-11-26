import type { ReactNode } from "react";
import { BrandPanel } from "./_components/brand-panel";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      <BrandPanel />
      <section className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 lg:px-12 xl:px-16">
        <div className="w-full max-w-[26rem]">{children}</div>
      </section>
    </main>
  );
}
