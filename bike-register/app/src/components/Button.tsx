import { ActivityIndicator, Pressable, Text } from "react-native";
import { colors } from "../theme";

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: isPrimary ? colors.accent : colors.surface,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        opacity: pressed || disabled || loading ? 0.7 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : colors.accent} />
      ) : (
        <Text style={{ color: isPrimary ? "#fff" : colors.text, fontWeight: "600", fontSize: 15 }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
