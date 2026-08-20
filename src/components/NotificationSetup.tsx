"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "default" | "subscribed" | "denied" | "loading";

export default function NotificationSetup({ profileId }: { profileId: string }) {
  const [status, setStatus] = useState<Status>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "default");
    });
  }, []);

  async function enable() {
    setStatus("loading");
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        alert("Push notifications aren't configured yet (missing VAPID key).");
        setStatus("default");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      const json = sub.toJSON();
      const supabase = createClient();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          profile_id: profileId,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setStatus("subscribed");
    } catch (err) {
      console.error(err);
      alert("Could not enable notifications. Try again, or check your browser's site settings.");
      setStatus("default");
    }
  }

  if (status === "unsupported") return null;

  return (
    <button
      onClick={status === "subscribed" ? undefined : enable}
      disabled={status === "loading" || status === "subscribed" || status === "denied"}
      title={
        status === "denied"
          ? "Notifications are blocked in your browser settings"
          : status === "subscribed"
            ? "Notifications are on"
            : "Get notified about new messages and project updates"
      }
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:cursor-default disabled:hover:bg-transparent"
    >
      {status === "subscribed"
        ? "🔔 Notifications on"
        : status === "denied"
          ? "🔕 Notifications blocked"
          : status === "loading"
            ? "Enabling…"
            : "🔔 Enable notifications"}
    </button>
  );
}
