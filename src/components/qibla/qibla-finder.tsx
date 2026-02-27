"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Compass, LocateFixed, MapPinned } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { calculateQiblaBearing } from "@/lib/geo";

type Coords = { lat: number; lng: number };

const KAABA_COORDS: Coords = { lat: 21.4225, lng: 39.8262 };

function bearingToDirection(value: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(value / 45) % 8;
  return directions[index];
}

export function QiblaFinder(): React.JSX.Element {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [heading, setHeading] = useState(0);
  const [hasLiveCompass, setHasLiveCompass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not available on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => setError("Location access denied. Qibla bearing uses your coordinates.")
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasOrientationAPI = "DeviceOrientationEvent" in window;
    if (!hasOrientationAPI) {
      setHasLiveCompass(false);
      return;
    }

    let receivedReading = false;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const webkitCompassHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitCompassHeading === "number") {
        setHeading(webkitCompassHeading);
        receivedReading = true;
        setHasLiveCompass(true);
        return;
      }

      if (typeof event.alpha === "number") {
        setHeading(360 - event.alpha);
        receivedReading = true;
        setHasLiveCompass(true);
      }
    };

    const timer = window.setTimeout(() => {
      if (!receivedReading) {
        setHasLiveCompass(false);
      }
    }, 2500);

    const enable = async () => {
      const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
      if (typeof ctor.requestPermission === "function") {
        const permission = await ctor.requestPermission().catch(() => "denied");
        if (permission !== "granted") {
          setHasLiveCompass(false);
          return;
        }
      }

      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    };

    void enable();

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  const bearing = useMemo(() => {
    if (!coords) return null;
    return calculateQiblaBearing(coords.lat, coords.lng);
  }, [coords]);

  const dialRotation = bearing !== null ? bearing - heading : 0;
  const degreeLabel = bearing !== null ? `${bearing.toFixed(0)}° ${bearingToDirection(bearing)}` : "Waiting for location";

  const mapProjection = useMemo(() => {
    if (!coords) return null;

    const minLatRaw = Math.min(coords.lat, KAABA_COORDS.lat);
    const maxLatRaw = Math.max(coords.lat, KAABA_COORDS.lat);
    const minLngRaw = Math.min(coords.lng, KAABA_COORDS.lng);
    const maxLngRaw = Math.max(coords.lng, KAABA_COORDS.lng);

    const latPad = Math.max(2, (maxLatRaw - minLatRaw) * 0.35);
    const lngPad = Math.max(2, (maxLngRaw - minLngRaw) * 0.35);

    const minLat = Math.max(-85, minLatRaw - latPad);
    const maxLat = Math.min(85, maxLatRaw + latPad);
    const minLng = Math.max(-180, minLngRaw - lngPad);
    const maxLng = Math.min(180, maxLngRaw + lngPad);

    const toPoint = (point: Coords): { x: number; y: number } => ({
      x: ((point.lng - minLng) / (maxLng - minLng)) * 100,
      y: ((maxLat - point.lat) / (maxLat - minLat)) * 100
    });

    const userPoint = toPoint(coords);
    const kaabaPoint = toPoint(KAABA_COORDS);

    const dx = kaabaPoint.x - userPoint.x;
    const dy = kaabaPoint.y - userPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik`;

    return {
      iframeSrc,
      userPoint,
      kaabaPoint,
      lineStyle: {
        left: `${userPoint.x}%`,
        top: `${userPoint.y}%`,
        width: `${length}%`,
        transform: `translateY(-50%) rotate(${angle}deg)`
      }
    };
  }, [coords]);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <GlassCard className="grid place-items-center overflow-hidden">
        <div className="grid place-items-center">
          {hasLiveCompass ? (
            <div className="relative grid h-72 w-72 place-items-center rounded-full border border-emerald-100 bg-gradient-to-br from-emerald-50 to-surface shadow-aura dark:border-emerald-900/40 dark:from-dark-700 dark:to-dark-800">
              <div className="absolute inset-5 rounded-full border border-emerald-100 dark:border-emerald-900/40" />
              <p className="absolute top-4 text-xs uppercase tracking-[0.2em] text-slate-500">N</p>
              <p className="absolute bottom-4 text-xs uppercase tracking-[0.2em] text-slate-500">S</p>
              <p className="absolute left-4 text-xs uppercase tracking-[0.2em] text-slate-500">W</p>
              <p className="absolute right-4 text-xs uppercase tracking-[0.2em] text-slate-500">E</p>

              <motion.div animate={{ rotate: dialRotation }} className="absolute h-56 w-56" transition={{ type: "spring", stiffness: 80, damping: 18 }}>
                <div className="absolute left-1/2 top-5 h-24 w-1 -translate-x-1/2 rounded-full bg-gold-400 shadow-[0_0_20px_rgba(212,175,106,0.7)]" />
                <div className="absolute left-1/2 top-20 -translate-x-1/2 text-xs font-semibold text-gold-600">Kaaba</div>
              </motion.div>

              <div className="h-5 w-5 rounded-full bg-emerald-500 ring-8 ring-emerald-100 dark:ring-emerald-900/60" />
            </div>
          ) : (
            <div className="relative grid h-72 w-72 place-items-center rounded-full border border-emerald-100 bg-gradient-to-br from-emerald-50 to-surface shadow-aura dark:border-emerald-900/40 dark:from-dark-700 dark:to-dark-800">
              <div className="absolute inset-5 rounded-full border border-emerald-100 dark:border-emerald-900/40" />
              <p className="absolute top-4 text-xs uppercase tracking-[0.2em] text-slate-500">N</p>
              <p className="absolute bottom-4 text-xs uppercase tracking-[0.2em] text-slate-500">S</p>
              <p className="absolute left-4 text-xs uppercase tracking-[0.2em] text-slate-500">W</p>
              <p className="absolute right-4 text-xs uppercase tracking-[0.2em] text-slate-500">E</p>

              <div className="absolute h-56 w-56" style={{ transform: `rotate(${bearing ?? 0}deg)` }}>
                <div className="absolute left-1/2 top-4 -translate-x-1/2 text-xl text-gold-600">▲</div>
                <div className="absolute left-1/2 top-10 -translate-x-1/2 text-xs font-semibold text-gold-600">Qibla</div>
              </div>

              <div className="h-5 w-5 rounded-full bg-emerald-500 ring-8 ring-emerald-100 dark:ring-emerald-900/60" />
            </div>
          )}

          <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">Direction: {degreeLabel}</p>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Find the Kaaba</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {hasLiveCompass
            ? "Keep your device flat for live compass rotation."
            : "Desktop/Laptop mode: static Qibla arrow, map line (you → Makkah), and exact degree are shown."}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm dark:border-emerald-900/50 dark:bg-dark-700"
            onClick={() => {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
                  setError(null);
                },
                () => setError("Unable to refresh location.")
              );
            }}
            type="button"
          >
            <LocateFixed className="h-4 w-4" />
            Refresh Location
          </button>

          <a
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm dark:border-emerald-900/50 dark:bg-dark-700"
            href={
              coords
                ? `https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${KAABA_COORDS.lat},${KAABA_COORDS.lng}`
                : `https://www.google.com/maps/place/${KAABA_COORDS.lat},${KAABA_COORDS.lng}`
            }
            rel="noreferrer"
            target="_blank"
          >
            <MapPinned className="h-4 w-4" />
            Open Full Map
          </a>
        </div>

        {!hasLiveCompass && mapProjection ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-100/80 dark:border-emerald-900/40">
            <div className="relative h-64 w-full bg-white dark:bg-dark-800">
              <iframe className="h-full w-full" src={mapProjection.iframeSrc} title="Qibla Map Projection" />

              <div className="pointer-events-none absolute inset-0">
                <div className="absolute h-0.5 origin-left bg-gold-500/90" style={mapProjection.lineStyle} />
                <div
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-700 bg-emerald-500"
                  style={{ left: `${mapProjection.userPoint.x}%`, top: `${mapProjection.userPoint.y}%` }}
                />
                <div
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-700 bg-gold-400"
                  style={{ left: `${mapProjection.kaabaPoint.x}%`, top: `${mapProjection.kaabaPoint.y}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-emerald-100/80 px-3 py-2 text-xs text-slate-600 dark:border-emerald-900/40 dark:text-slate-300">
              <span>● You</span>
              <span>● Makkah</span>
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-emerald-100/80 bg-emerald-50/80 p-4 text-sm dark:border-emerald-900/40 dark:bg-dark-700/60">
          <p className="inline-flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-200">
            <Compass className="h-4 w-4" />
            Precision Tip
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Avoid nearby magnets, metal cases, or strong electrical devices for better accuracy.</p>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      </GlassCard>
    </div>
  );
}
