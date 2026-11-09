// Notifications on this device (the browser or the installed app). Email alerts need an account server.

export const deviceNotificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

export const deviceNotificationsAllowed = () => deviceNotificationsSupported() && Notification.permission === "granted";

/** Asks the browser for permission; resolves to true when notifications can be shown */
export async function askForDeviceNotifications(): Promise<boolean> {
  if (!deviceNotificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

export function notifyDevice(title: string, body: string) {
  if (!deviceNotificationsAllowed()) return;
  try {
    new Notification(title, { body, icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, tag: title });
  } catch {
    // Some phones only allow notifications from the service worker
    navigator.serviceWorker?.ready.then((reg) => reg.showNotification(title, { body, tag: title })).catch(() => {});
  }
}
