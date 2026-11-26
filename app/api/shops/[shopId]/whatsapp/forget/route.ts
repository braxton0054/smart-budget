import { NextResponse } from "next/server";
import { ownedShopForApi } from "@/lib/auth-guards";
import { forgetShopSession } from "@/lib/openwa";

/** Revokes the shop's scoped key and removes the OpenWA session and its stored state. */
export async function DELETE(request: Request, { params }: { params: Promise<{ shopId: string }> }) {
  if (request.headers.get("x-smartbudget") !== "1") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { shopId } = await params;
  const owned = await ownedShopForApi(shopId);
  if ("error" in owned) {
    return NextResponse.json({ error: "Not allowed" }, { status: owned.error });
  }

  try {
    await forgetShopSession(shopId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to forget WhatsApp session", error);
    return NextResponse.json({ error: "Could not remove the WhatsApp session" }, { status: 500 });
  }
}
