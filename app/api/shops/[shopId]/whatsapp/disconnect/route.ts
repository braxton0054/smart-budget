import { NextResponse } from "next/server";
import { entitledShopForApi } from "@/lib/auth-guards";
import { disconnectShopSession, OpenwaError } from "@/lib/openwa";

export async function POST(request: Request, { params }: { params: Promise<{ shopId: string }> }) {
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
