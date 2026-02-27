"use client";

import type { WebPushSubscription } from "@/lib/push/types";

function base64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const array = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    array[i] = raw.charCodeAt(i);
  }

  return array;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported on this browser.");
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeBrowserPush(publicKey: string): Promise<PushSubscription> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported on this browser.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(publicKey) as unknown as BufferSource
  });
}

export function toWebPushJSON(subscription: PushSubscription): WebPushSubscription {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? ""
    }
  };
}
