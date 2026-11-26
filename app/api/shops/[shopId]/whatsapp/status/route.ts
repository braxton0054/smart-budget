import { NextResponse } from "next/server";
import { ownedShopForApi } from "@/lib/auth-guards";
import { OpenwaError, refreshShopSession, toView } from "@/lib/openwa";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const owned = await ownedShopForApi(shopId);
  if ("error" in owned) {
    return NextResponse.json({ error: "Not allowed" }, { status: owned.error });
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
