import { NextResponse } from "next/server";
import { getPublicVapidKey } from "@/lib/push/service";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const key = getPublicVapidKey();
  if (!key) {
    return NextResponse.json({ error: "Web push is not configured" }, { status: 503 });
  }

  return NextResponse.json({ publicKey: key });
}
