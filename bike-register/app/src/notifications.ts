import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Asks for notification permission and returns this device's Expo push token, or null if denied. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") {
    // Web push needs its own VAPID setup and isn't part of Expo's push service the same way
    // native tokens are. The web build works for registering bikes and viewing scan history;
    // install the Android/iOS app to actually receive scan notifications.
    console.warn("Push notifications aren't available on web — use the Android or iOS app to receive them.");
    return null;
  }

  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device (not a simulator).");
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Bike scan alerts",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('No EAS projectId configured — run "eas init" and rebuild before push tokens will work.');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
