import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { registerBike } from "../api";
import { addSavedBike } from "../storage";
import { colors } from "../theme";
import { Button } from "../components/Button";
import { Field } from "../components/Field";

export function RegisterBikeScreen({
  pushToken,
  onRegistered,
  onCancel,
}: {
  pushToken: string | null;
  onRegistered: (bikeId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert("Bike name required", "Give this bike a name so you can recognize it in the app.");
      return;
    }
    setSubmitting(true);
    try {
      const bike = await registerBike({
        name: name.trim(),
        ownerPushToken: pushToken ?? undefined,
        ownerName: ownerName.trim() || undefined,
        ownerEmail: ownerEmail.trim() || undefined,
        ownerPhone: ownerPhone.trim() || undefined,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        color: color.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
      });
      await addSavedBike({ id: bike.id, ownerSecret: bike.ownerSecret });
      onRegistered(bike.id);
    } catch (err) {
      Alert.alert("Registration failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 4 }}>
          Register a bike
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 20 }}>
          These details help you (and anyone who finds this bike) confirm ownership. Only the bike's
          name is ever shown on the scan page — your contact info stays private to your account.
        </Text>

        <Field label="Bike name" required placeholder="e.g. Red commuter bike" value={name} onChangeText={setName} />

        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 8, marginBottom: 10 }}>
          Bike details
        </Text>
        <Field label="Make" placeholder="e.g. Trek" value={make} onChangeText={setMake} />
        <Field label="Model" placeholder="e.g. FX 3" value={model} onChangeText={setModel} />
        <Field label="Color" placeholder="e.g. Matte black" value={color} onChangeText={setColor} />
        <Field
          label="Serial number"
          placeholder="Usually stamped under the bottom bracket"
          value={serialNumber}
          onChangeText={setSerialNumber}
          autoCapitalize="characters"
        />

        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 8, marginBottom: 10 }}>
          Your contact info
        </Text>
        <Field label="Your name" placeholder="Full name" value={ownerName} onChangeText={setOwnerName} />
        <Field
          label="Email"
          placeholder="you@example.com"
          value={ownerEmail}
          onChangeText={setOwnerEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Phone"
          placeholder="Optional"
          value={ownerPhone}
          onChangeText={setOwnerPhone}
          keyboardType="phone-pad"
        />

        <View style={{ height: 8 }} />
        <Button title="Register bike" onPress={handleSubmit} loading={submitting} />
        <View style={{ height: 10 }} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}
