"use client";

import { useEffect } from "react";
import { getPushSubscription, toWebPushJSON } from "@/lib/push/client";
import { useAppStore } from "@/store/use-app-store";

export function NotificationPreferenceSync(): React.JSX.Element | null {
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const preferredLocation = useAppStore((state) => state.preferredLocation);
  const prayerMethod = useAppStore((state) => state.prayerMethod);
  const notificationLeadMinutes = useAppStore((state) => state.notificationLeadMinutes);
  const notificationPrayerPrefs = useAppStore((state) => state.notificationPrayerPrefs);

  useEffect(() => {
    if (!notificationsEnabled || !preferredLocation) return;

    let cancelled = false;

    void getPushSubscription()
      .then((subscription) => {
        if (!subscription || cancelled) return;

        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: toWebPushJSON(subscription),
            lat: preferredLocation.lat,
            lng: preferredLocation.lng,
            method: prayerMethod,
            locationName: preferredLocation.label,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            leadMinutes: notificationLeadMinutes,
            prayerPrefs: notificationPrayerPrefs
          })
        }).catch(() => undefined);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [notificationLeadMinutes, notificationPrayerPrefs, notificationsEnabled, preferredLocation, prayerMethod]);

  return null;
}
