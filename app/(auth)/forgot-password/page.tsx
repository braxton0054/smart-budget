import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
