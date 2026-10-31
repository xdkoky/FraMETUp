"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useT } from "@/i18n/client";

/**
 * Keeps a production screen in sync: polls a tiny endpoint and refreshes the page when
 * anyone changes something. Shows when the connection drops; nothing is ever discarded —
 * every change is saved by the server action that made it.
 */
export function LivePulse({ productionId, initial, intervalMs = 5000 }: { productionId: string; initial: string | null; intervalMs?: number }) {
  const t = useT();
  const router = useRouter();
  const last = useRef(initial);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/productions/${productionId}/pulse`, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const { changedAt } = (await r.json()) as { changedAt: string | null };
        if (!stop) setOnline(true);
        if (changedAt && changedAt !== last.current) {
          last.current = changedAt;
          router.refresh();
        }
      } catch {
        if (!stop) setOnline(false);
      }
    };
    const id = setInterval(tick, intervalMs);
    const onVis = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onVis);
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onVis);
    };
  }, [productionId, intervalMs, router]);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${online ? "text-success-strong" : "text-danger"}`} aria-live="polite">
      {online ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
      {online ? t("Live — updates automatically") : t("Offline — reconnecting. Your last action may not have saved.")}
    </span>
  );
}
