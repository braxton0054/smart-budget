import { NextResponse } from "next/server";
import { entitledShopForApi } from "@/lib/auth-guards";
import { OpenwaError, refreshShopSession, toView } from "@/lib/openwa";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const owned = await entitledShopForApi(shopId);
  if ("error" in owned) {
    const message = "reason" in owned ? "Choose and pay for a plan before connecting WhatsApp." : "Not allowed";
    return NextResponse.json({ error: message }, { status: owned.error });
  }

  try {
    const status = await refreshShopSession(shopId);
    if (status) return NextResponse.json(status);
    const session = await prisma.waSession.findFirst({ where: { shopId } });
    return NextResponse.json(toView(session));
  } catch (error) {
    if (error instanceof OpenwaError) {
      return NextResponse.json({ error: `OpenWA: ${error.message}` }, { status: 502 });
    }
    console.error("Failed to read WhatsApp status", error);
    return NextResponse.json({ error: "Could not read the WhatsApp session" }, { status: 500 });
  }
}
