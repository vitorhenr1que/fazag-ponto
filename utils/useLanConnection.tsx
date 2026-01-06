import { useCallback, useEffect, useRef, useState } from "react";

type UseLanOptions = {
  pingUrl?: string;          // ex: "http://192.168.0.10:5173/__ping"
  intervalMs?: number;       // ex: 5000
  timeoutMs?: number;        // ex: 2000
  failThreshold?: number;    // ex: 2 (quantas falhas seguidas pra considerar "fora")
};

export function useLanConnection(options: UseLanOptions = {}) {
  const {
    pingUrl = `${location.origin}/__ping`,
    intervalMs = 10_000,
    timeoutMs = 2_000,
    failThreshold = 2,
  } = options;

  const [isLanConnected, setIsLanConnected] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const failCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const ping = useCallback(async () => {
    // Se o browser já diz que está offline, nem tenta pingar
    if (!navigator.onLine) {
      setIsOnline(false);
      failCountRef.current = failThreshold;
      setIsLanConnected(false);
      return;
    }

    setIsOnline(true);

    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      // cache: "no-store" + query param pra driblar cache agressivo (PWA/SW)
      const res = await fetch(`${pingUrl}?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Cache-Control": "no-cache" },
      });

      window.clearTimeout(t);

      if (!res.ok) throw new Error(`Ping failed: ${res.status}`);

      failCountRef.current = 0;
      setIsLanConnected(true);
    } catch {
      window.clearTimeout(t);

      failCountRef.current += 1;

      if (failCountRef.current >= failThreshold) {
        setIsLanConnected(false);
      }
    }
  }, [pingUrl, timeoutMs, failThreshold]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      ping(); // tenta recuperar assim que voltar
    };
    const onOffline = () => {
      setIsOnline(false);
      setIsLanConnected(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // roda já e depois em intervalo
    ping();
    timerRef.current = window.setInterval(ping, intervalMs);

    // reforço: quando volta pro app, valida de novo
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [ping, intervalMs]);

  return { isLanConnected, isOnline, pingNow: ping };
}