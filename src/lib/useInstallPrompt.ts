import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Chrome and Edge fire this once the app can be installed; we keep it for the Install button
let saved: InstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    saved = e as InstallPromptEvent;
  });
}

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * How StockNest can be installed here:
 * "installed" (already running as an app), "prompt" (we can show the browser's install dialog),
 * "ios" (Safari: Share → Add to Home Screen) or "menu" (use the browser's menu).
 */
export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(saved);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      saved = e as InstallPromptEvent;
      setEvent(saved);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const how: "installed" | "prompt" | "ios" | "menu" = installed ? "installed" : event ? "prompt" : isIos() ? "ios" : "menu";

  async function install() {
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    saved = null;
    setEvent(null);
    if (outcome === "accepted") setInstalled(true);
    return outcome === "accepted";
  }

  return { how, install };
}
