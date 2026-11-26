export type AuthMode = "login" | "register" | "forgot";

export type AuthField = "name" | "email" | "password" | "token";

export type AuthState = {
  status: "idle" | "error" | "notice" | "success";
  message: string;
  errors?: Partial<Record<AuthField, string>>;
};

export const initialAuthState: AuthState = { status: "idle", message: "" };
