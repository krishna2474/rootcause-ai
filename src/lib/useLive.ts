"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "./supabase-browser";

/**
 * Fetches `url` and keeps it fresh. It always polls every `pollMs`; with Supabase Realtime configured it also
 * refetches instantly on any change to `tables`. Polling stays on so a Realtime that isn't delivering (publication
 * not set up, blocked websocket) never leaves the screen stale.
 */
export function useLive<T>(url: string, tables: string[], pollMs = 2000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const again = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    // A change that lands mid-fetch queues one more fetch instead of being dropped.
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setData(body as T);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        void refresh();
      }
    }
  }, [url]);

  const tableKey = tables.join(",");
  useEffect(() => {
    refresh();
    const sb = supabaseBrowser();
    let channel: ReturnType<NonNullable<typeof sb>["channel"]> | null = null;
    if (sb) {
      channel = sb.channel(`live:${url}`);
      for (const table of tableKey.split(",")) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, () => refresh());
      }
      channel.subscribe();
    }
    const id = setInterval(refresh, pollMs);
    return () => {
      clearInterval(id);
      if (sb && channel) sb.removeChannel(channel);
    };
  }, [refresh, tableKey, pollMs, url]);

  return { data, error, refresh };
}
