import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { pushSubscribeSchema } from "@/lib/push/types";
import { getPushCollection } from "@/lib/push/storage";
import { isWebPushConfigured } from "@/lib/push/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`push-subscribe:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web push is not configured" }, { status: 503 });
  }
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: "MONGODB_URI is missing" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pushSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid push subscription payload" }, { status: 400 });
  }

  try {
    const collection = await getPushCollection();
    const now = new Date();

    await collection.updateOne(
      { endpoint: parsed.data.subscription.endpoint },
      {
        $set: {
          endpoint: parsed.data.subscription.endpoint,
          expirationTime: parsed.data.subscription.expirationTime ?? null,
          keys: parsed.data.subscription.keys,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          method: parsed.data.method,
          locationName: parsed.data.locationName,
          timezone: parsed.data.timezone,
          language: parsed.data.language,
          active: true,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to persist push subscription" }, { status: 500 });
  }
}
