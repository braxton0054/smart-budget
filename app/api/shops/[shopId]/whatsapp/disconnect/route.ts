import { NextResponse } from "next/server";
import { ownedShopForApi } from "@/lib/auth-guards";
import { disconnectShopSession, OpenwaError } from "@/lib/openwa";

export async function POST(request: Request, { params }: { params: Promise<{ shopId: string }> }) {
  if (request.headers.get("x-smartbudget") !== "1") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { shopId } = await params;
  const owned = await ownedShopForApi(shopId);
  if ("error" in owned) {
    return NextResponse.json({ error: "Not allowed" }, { status: owned.error });
  }

  try {
    const status = await disconnectShopSession(shopId);
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof OpenwaError) {
      return NextResponse.json({ error: `OpenWA: ${error.message}` }, { status: 502 });
    }
    console.error("Failed to disconnect WhatsApp", error);
    return NextResponse.json({ error: "Could not disconnect the WhatsApp session" }, { status: 500 });
  }
}
