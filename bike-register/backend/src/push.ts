interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  priority?: "high";
}

/**
 * Sends a push notification through Expo's push service. Expo's SDK on the app side
 * hands out tokens shaped like "ExponentPushToken[...]"; this is a bare fetch so the
 * Worker doesn't need the Expo server SDK (which assumes a Node runtime).
 */
export async function sendExpoPush(message: ExpoPushMessage): Promise<void> {
  if (!message.to || !message.to.startsWith("ExponentPushToken")) {
    return; // no device registered for this bike yet
  }

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      to: message.to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: message.sound ?? "default",
      priority: message.priority ?? "high",
    }),
  });
}
