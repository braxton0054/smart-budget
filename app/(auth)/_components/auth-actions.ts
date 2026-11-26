"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureShopForUser } from "@/lib/shop-provisioning";
import { isSuperadminEmail } from "@/lib/superadmin";
import type { AuthState } from "./auth-types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;
const MAX_NAME = 80;
const MAX_PASSWORD = 200;

function invalid(message: string, errors: NonNullable<AuthState["errors"]>): AuthState {
  return { status: "error", message, errors };
}

function isRedirect(error: unknown) {
  return typeof (error as { digest?: string })?.digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

function validatePassword(password: string, errors: NonNullable<AuthState["errors"]>) {
  if (password.length < 8 || password.length > MAX_PASSWORD) {
    errors.password = "Use between 8 and 200 characters.";
  } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = "Include at least one letter and one number.";
  }
}

export async function signInWithEmail(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const errors: NonNullable<AuthState["errors"]> = {};
  if (!email || email.length > MAX_EMAIL || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
  if (!password || password.length > MAX_PASSWORD) errors.password = "Enter your password.";
  if (Object.keys(errors).length > 0) return invalid("Check the highlighted fields and try again.", errors);
  if (isSuperadminEmail(email)) {
    return { status: "error", message: "That email and password don't match. Try again." };
  }

  try {
    // Credential failures stay generic — never reveal which half was wrong.
    await signIn("credentials", { email, password, redirectTo: "/after-signin" });
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { status: "error", message: "That email and password don't match. Try again." };
  }
  return { status: "idle", message: "" };
}

export async function signUpWithEmail(_state: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const errors: NonNullable<AuthState["errors"]> = {};
  if (name.length < 2 || name.length > MAX_NAME) errors.name = "Enter your name (2–80 characters).";
  if (!email || email.length > MAX_EMAIL || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
  validatePassword(password, errors);
  if (Object.keys(errors).length > 0) return invalid("Check the highlighted fields and try again.", errors);
  if (isSuperadminEmail(email)) {
    return invalid("Superadmin accounts use Google sign-in.", {
      email: "Use Google sign-in for this account.",
    });
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return invalid("An account with that email already exists. Sign in instead.", {
      email: "Use sign in for this email.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await prisma.user.create({
    data: { email, name, passwordHash, role: "SHOP_OWNER" },
  });
  await ensureShopForUser({ userId: created.id, email, name });
  await prisma.auditLog.create({
    data: { action: "ACCOUNT_CREATED", target: email, metadata: { source: "email_signup" } },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/after-signin" });
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { status: "error", message: "Account created. Sign in with your email and password." };
  }
  return { status: "idle", message: "" };
}

export async function requestPasswordReset(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const errors: NonNullable<AuthState["errors"]> = {};
  if (!email || email.length > MAX_EMAIL || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length > 0) return invalid("Check the highlighted field and try again.", errors);

  // Always return the same message so this endpoint cannot enumerate accounts.
  const generic = "If an account exists for that email, a reset link is on its way.";

  // Superadmin sign-in is Google-only; never issue a password reset for it.
  if (isSuperadminEmail(email)) return { status: "success", message: generic };
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, passwordHash: true } });
  if (!user?.passwordHash) return { status: "success", message: generic };

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/reset-password?token=${token}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: "Reset your Smart Budget password",
      html: `<p>Hello ${user.name ?? "there"},</p><p>Use this link to reset your password: <a href="${link}">${link}</a></p><p>The link expires in 1 hour. If you did not request it, ignore this email.</p>`,
    }),
  });
  if (!response.ok) {
    // Do not leave an unusable token behind when delivery fails.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    return { status: "error", message: "The reset email could not be sent. Try again shortly." };
  }

  await prisma.auditLog.create({
    data: { action: "PASSWORD_RESET_REQUESTED", target: email },
  });
  return { status: "success", message: generic };
}

export async function resetPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const errors: NonNullable<AuthState["errors"]> = {};
  if (!/^[a-f0-9]{64}$/.test(token)) errors.token = "This reset link is invalid.";
  validatePassword(password, errors);
  if (Object.keys(errors).length > 0) return invalid("Check the highlighted fields and try again.", errors);

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return invalid("This reset link has expired. Request a new one.", { token: "Request a new link." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  await prisma.auditLog.create({
    data: { action: "PASSWORD_RESET_COMPLETED", target: record.userId },
  });

  return { status: "success", message: "Password updated. Sign in with your new password." };
}
