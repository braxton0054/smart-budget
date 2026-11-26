import { NextResponse } from "next/server";
import { entitledShopForApi } from "@/lib/auth-guards";
import { connectShopSession, OpenwaError } from "@/lib/openwa";
import { prisma } from "@/lib/prisma";

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

  const shop = await prisma.shop.findUnique({ where: { id: owned.shop.id } });
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  try {
    const status = await connectShopSession(shop);
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof OpenwaError) {
      return NextResponse.json({ error: `OpenWA: ${error.message}` }, { status: 502 });
    }
    console.error("Failed to connect WhatsApp", error);
    return NextResponse.json({ error: "Could not start the WhatsApp session" }, { status: 500 });
  }
}
