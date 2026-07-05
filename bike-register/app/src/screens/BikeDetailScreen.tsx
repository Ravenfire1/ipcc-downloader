import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BikeDetail, ScanRecord, getBike, getBikeScans } from "../api";
import { getOwnerSecret } from "../storage";
import { colors } from "../theme";
import { Button } from "../components/Button";
import { QrCode } from "../components/QrCode";

function formatScanLocation(scan: ScanRecord): string {
  const place = [scan.ip_city, scan.ip_region, scan.ip_country].filter(Boolean).join(", ");
  if (scan.lat != null && scan.lng != null) {
    return place ? `${place} (${scan.lat.toFixed(4)}, ${scan.lng.toFixed(4)})` : `${scan.lat.toFixed(4)}, ${scan.lng.toFixed(4)}`;
  }
  return place || "Location unavailable";
}

export function BikeDetailScreen({ bikeId, onBack }: { bikeId: string; onBack: () => void }) {
  const [bike, setBike] = useState<BikeDetail | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const ownerSecret = await getOwnerSecret(bikeId);
      if (!ownerSecret) throw new Error("Missing owner credentials for this bike on this device.");
      const [bikeDetail, scanHistory] = await Promise.all([
        getBike(bikeId, ownerSecret),
        getBikeScans(bikeId, ownerSecret),
      ]);
      setBike(bikeDetail);
      setScans(scanHistory.scans);
    } catch (err) {
      Alert.alert("Couldn't load bike", err instanceof Error ? err.message : "Please try again.");
    }
  }, [bikeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleShare() {
    if (!bike) return;
    await Share.share({
      message: `${bike.name} is registered with Bike Register. Scan QR: ${bike.qrCodeUrl}`,
      url: bike.qrCodeUrl,
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={scans}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
        contentContainerStyle={{ padding: 20 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            <Text onPress={onBack} style={{ color: colors.accent, marginBottom: 16 }}>
              ← Your bikes
            </Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{bike?.name ?? "Loading…"}</Text>
            {bike && (
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                Registration code: {bike.registrationCode}
              </Text>
            )}

            {bike?.qrCodeUrl && (
              <View style={{ alignItems: "center", marginVertical: 24 }}>
                <QrCode url={bike.qrCodeUrl} />
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12, textAlign: "center" }}>
                  Print this QR code and stick it on the bike. Scanning it notifies you with the scanner's
                  location.
                </Text>
                <View style={{ height: 12 }} />
                <Button title="Share sticker QR" variant="secondary" onPress={handleShare} />
              </View>
            )}

            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 8 }}>Scan history</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>No scans yet — you'll get a notification the moment someone scans the sticker.</Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{formatScanLocation(item)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              {new Date(item.scanned_at + "Z").toLocaleString()} ·{" "}
              {item.location_source === "gps" ? "precise location" : "approximate (IP-based)"}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
