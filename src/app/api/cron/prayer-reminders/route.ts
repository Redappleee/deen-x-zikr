import { NextRequest, NextResponse } from "next/server";
import { getPushCollection } from "@/lib/push/storage";
import { getDuePrayerNotification } from "@/lib/push/prayer-dispatch";
import { isWebPushConfigured, sendWebPush } from "@/lib/push/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web push is not configured" }, { status: 503 });
  }
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: "MONGODB_URI is missing" }, { status: 503 });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is missing" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const querySecret = request.nextUrl.searchParams.get("secret");
  const headerSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (headerSecret !== secret && querySecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collection = await getPushCollection();
  const subscriptions = await collection.find({ active: true }).toArray();

  let sent = 0;
  let skipped = 0;
  let expired = 0;

  for (const subscription of subscriptions) {
    try {
      const due = await getDuePrayerNotification(subscription, new Date(), 10);
      if (!due) {
        skipped += 1;
        continue;
      }

      if (subscription.lastNotifiedKey === due.key) {
        skipped += 1;
        continue;
      }

      const body =
        due.startsInMinutes <= 1
          ? `It is time for ${due.prayer} in ${subscription.locationName}.`
          : `${due.prayer} starts in ${due.startsInMinutes} minutes (${subscription.locationName}).`;

      await sendWebPush(subscription, {
        title: `Prayer Reminder · ${due.prayer}`,
        body,
        tag: `prayer-${due.key}`,
        prayer: due.prayer,
        locationName: subscription.locationName,
        url: "/salah"
      });

      await collection.updateOne(
        { endpoint: subscription.endpoint },
        {
          $set: {
            updatedAt: new Date(),
            lastNotifiedAt: new Date(),
            lastNotifiedKey: due.key
          }
        }
      );

      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await collection.updateOne(
          { endpoint: subscription.endpoint },
          {
            $set: {
              active: false,
              updatedAt: new Date()
            }
          }
        );
        expired += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return NextResponse.json({ success: true, total: subscriptions.length, sent, skipped, expired });
}
