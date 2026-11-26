import { signIn } from "@/auth";
import { GoogleMark } from "./icons";

export function GoogleSignInButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/after-signin" });
      }}
    >
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-nt-line bg-nt-surface text-sm font-medium text-nt-ink transition-colors hover:border-nt-cyan/50 hover:bg-nt-raised"
      >
        <GoogleMark className="h-[18px] w-[18px]" />
        Continue with Google
      </button>
    </form>
  );
}
