import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { getPushCollection } from "@/lib/push/storage";
import { isWebPushConfigured, sendWebPush } from "@/lib/push/service";
import { webPushSubscriptionSchema } from "@/lib/push/types";

const schema = z.object({
  endpoint: z.string().url().optional(),
  subscription: webPushSubscriptionSchema.optional()
})
  .refine((value) => Boolean(value.endpoint || value.subscription), {
    message: "endpoint or subscription is required"
  });

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web push is not configured" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`push-test:${ip}`, 12, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid test payload" }, { status: 400 });
  }

  let collection = null as Awaited<ReturnType<typeof getPushCollection>> | null;
  let subscription =
    parsed.data.subscription ??
    null;

  try {
    if (!subscription && parsed.data.endpoint) {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json({ error: "Subscription not found and database is unavailable" }, { status: 404 });
      }
      collection = await getPushCollection();
      const stored = await collection.findOne({ endpoint: parsed.data.endpoint, active: true });
      if (stored) {
        subscription = {
          endpoint: stored.endpoint,
          expirationTime: stored.expirationTime,
          keys: stored.keys
        };
      }
    }

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    await sendWebPush(subscription, {
      title: "Deen X Zikr",
      body: "Web push is active. You will receive prayer reminders.",
      url: "/salah",
      tag: "push-test"
    });

    return NextResponse.json({ success: true, source: parsed.data.subscription ? "request" : "database" });
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;

    if ((statusCode === 404 || statusCode === 410) && parsed.data.endpoint && process.env.MONGODB_URI) {
      try {
        if (!collection) {
          collection = await getPushCollection();
        }
        await collection.updateOne(
          { endpoint: parsed.data.endpoint },
          {
            $set: {
              active: false,
              updatedAt: new Date()
            }
          }
        );
      } catch {
        // no-op
      }
    }

    const message = error instanceof Error ? error.message : "Push test failed";
    return NextResponse.json({ error: message, statusCode: statusCode ?? null }, { status: 500 });
  }
}
