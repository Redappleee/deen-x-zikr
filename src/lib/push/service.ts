import webpush from "web-push";

let configured = false;

export function isWebPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export function getPublicVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null;
}

export function ensureWebPushConfigured(): void {
  if (!isWebPushConfigured()) {
    throw new Error("Web push is not configured.");
  }

  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
}

export async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string }; expirationTime?: number | null },
  payload: Record<string, unknown>
): Promise<void> {
  ensureWebPushConfigured();
  await webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60,
    urgency: "high"
  });
}
