import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BikeDetail, getBike } from "../api";
import { getSavedBikes } from "../storage";
import { colors } from "../theme";
import { Button } from "../components/Button";

export function HomeScreen({
  onSelectBike,
  onRegisterBike,
  refreshKey,
}: {
  onSelectBike: (bikeId: string) => void;
  onRegisterBike: () => void;
  refreshKey: number;
}) {
  const [bikes, setBikes] = useState<BikeDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const bikes = await getSavedBikes();
    const results = await Promise.all(
      bikes.map((b) => getBike(b.id, b.ownerSecret).catch(() => null))
    );
    setBikes(results.filter((b): b is BikeDetail => b !== null));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "700" }}>🚲 Bike Register</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4, marginBottom: 20 }}>
          Register a bike, stick the QR code on it, and get notified the moment it's scanned.
        </Text>
      </View>

      <FlatList
        data={bikes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, textAlign: "center" }}>
                No bikes registered yet on this device.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelectBike(item.id)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              {[item.bike.make, item.bike.model, item.bike.color].filter(Boolean).join(" · ") ||
                item.registrationCode}
            </Text>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 4 }}>
            <Button title="+ Register a bike" onPress={onRegisterBike} />
          </View>
        }
      />
    </SafeAreaView>
  );
}
