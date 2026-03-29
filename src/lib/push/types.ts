import { z } from "zod";

export const webPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

export const pushSubscribeSchema = z.object({
  subscription: webPushSubscriptionSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  method: z.number().int().min(1).max(25),
  locationName: z.string().min(1).max(160),
  timezone: z.string().min(1).max(120),
  language: z.string().max(32).optional(),
  leadMinutes: z.number().int().min(0).max(60).default(10),
  prayerPrefs: z.object({
    Fajr: z.boolean(),
    Dhuhr: z.boolean(),
    Asr: z.boolean(),
    Maghrib: z.boolean(),
    Isha: z.boolean()
  })
});

export type WebPushSubscription = z.infer<typeof webPushSubscriptionSchema>;
export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

export type PushSubscriptionDoc = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  lat: number;
  lng: number;
  method: number;
  locationName: string;
  timezone: string;
  language?: string;
  leadMinutes: number;
  prayerPrefs: {
    Fajr: boolean;
    Dhuhr: boolean;
    Asr: boolean;
    Maghrib: boolean;
    Isha: boolean;
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastNotifiedKey?: string;
  lastNotifiedAt?: Date;
};
