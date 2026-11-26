import { NextResponse } from "next/server";
import { entitledShopForApi } from "@/lib/auth-guards";
import { forgetShopSession } from "@/lib/openwa";

/** Revokes the shop's scoped key and removes the OpenWA session and its stored state. */
export async function DELETE(request: Request, { params }: { params: Promise<{ shopId: string }> }) {
  if (request.headers.get("x-smartbudget") !== "1") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { shopId } = await params;
  const owned = await entitledShopForApi(shopId);
  if ("error" in owned) {
    const message = "reason" in owned ? "Choose and pay for a plan before connecting WhatsApp." : "Not allowed";
    return NextResponse.json({ error: message }, { status: owned.error });
  }

  try {
    await forgetShopSession(shopId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to forget WhatsApp session", error);
    return NextResponse.json({ error: "Could not remove the WhatsApp session" }, { status: 500 });
  }
}
