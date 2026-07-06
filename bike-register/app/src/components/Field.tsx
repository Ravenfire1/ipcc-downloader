import { Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "../theme";

export function Field({
  label,
  required,
  ...inputProps
}: { label: string; required?: boolean } & TextInputProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        placeholderTextColor="#6b7094"
        style={{
          backgroundColor: colors.surface,
          color: colors.text,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
        }}
        {...inputProps}
      />
    </View>
  );
}
