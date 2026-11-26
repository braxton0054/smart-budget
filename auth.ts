import { cache } from "react";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { ensureShopForUser } from "@/lib/shop-provisioning";

const roleForEmail = cache(async (email: string) =>
  prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { role: true } }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.SESSION_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // Superadmin and Google-only accounts have no password hash.
        if (!user?.passwordHash) return null;
        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn({ user }) {
      return Boolean(user.email);
    },
    // Role lives in Postgres (seeded from SUPERADMIN_EMAIL), never in a cookie.
    async session({ session, token }) {
      if (token.email) {
        const user = await roleForEmail(String(token.email));
        (session.user as { role?: string }).role = user?.role ?? "SHOP_OWNER";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.email) return;
      const adminEmails = (process.env.SUPERADMIN_EMAIL ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
      const email = user.email.toLowerCase();
      const role = adminEmails.includes(email) ? "SUPERADMIN" : "SHOP_OWNER";
      const record = await prisma.user.upsert({
        where: { email },
        update: { name: user.name ?? undefined, image: user.image ?? undefined, role },
        create: { email, name: user.name, image: user.image, role },
      });
      // Google sign-ins (and any owner restored by an admin) arrive here without
      // a shop. Give them the same STARTER trial that email signup receives.
      if (role === "SHOP_OWNER") {
        await ensureShopForUser({ userId: record.id, email, name: user.name ?? record.name });
      }
    },
  },
});
