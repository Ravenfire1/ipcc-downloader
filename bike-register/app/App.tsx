import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { registerForPushNotifications } from "./src/notifications";
import { updateBikeToken } from "./src/api";
import { getSavedBikes } from "./src/storage";
import { colors } from "./src/theme";
import { HomeScreen } from "./src/screens/HomeScreen";
import { RegisterBikeScreen } from "./src/screens/RegisterBikeScreen";
import { BikeDetailScreen } from "./src/screens/BikeDetailScreen";

type Screen = { name: "home" } | { name: "register" } | { name: "bikeDetail"; bikeId: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const notificationListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotifications().then(async (token) => {
      setPushToken(token);
      if (!token) return;
      // Keep every bike registered on this device pointed at the current token,
      // in case the app was reinstalled or notification permissions changed.
      const bikes = await getSavedBikes();
      await Promise.all(
        bikes.map((b) => updateBikeToken(b.id, token, b.ownerSecret).catch(() => undefined))
      );
    });

    notificationListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const bikeId = response.notification.request.content.data?.bikeId as string | undefined;
      if (bikeId) setScreen({ name: "bikeDetail", bikeId });
    });

    return () => {
      notificationListener.current?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <StatusBar style="light" />
      {screen.name === "home" && (
        <HomeScreen
          refreshKey={homeRefreshKey}
          onSelectBike={(bikeId) => setScreen({ name: "bikeDetail", bikeId })}
          onRegisterBike={() => setScreen({ name: "register" })}
        />
      )}
      {screen.name === "register" && (
        <RegisterBikeScreen
          pushToken={pushToken}
          onCancel={() => setScreen({ name: "home" })}
          onRegistered={(bikeId) => {
            setHomeRefreshKey((k) => k + 1);
            setScreen({ name: "bikeDetail", bikeId });
          }}
        />
      )}
      {screen.name === "bikeDetail" && (
        <BikeDetailScreen bikeId={screen.bikeId} onBack={() => setScreen({ name: "home" })} />
      )}
    </SafeAreaProvider>
  );
}
