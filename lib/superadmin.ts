export function isSuperadminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return (process.env.SUPERADMIN_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}
