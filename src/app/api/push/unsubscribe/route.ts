import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { getPushCollection } from "@/lib/push/storage";

const schema = z.object({
  endpoint: z.string().url()
});

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: "MONGODB_URI is missing" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`push-unsubscribe:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid unsubscribe payload" }, { status: 400 });
  }

  try {
    const collection = await getPushCollection();
    await collection.updateOne(
      { endpoint: parsed.data.endpoint },
      {
        $set: {
          active: false,
          updatedAt: new Date()
        }
      }
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
