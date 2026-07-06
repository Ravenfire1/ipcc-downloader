import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { colors } from "../theme";

export function QrCode({ url, size = 240 }: { url: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setFailed(false);
    fetch(url)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error("qr fetch failed"))))
      .then((text) => {
        if (!cancelled) setSvg(text);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {svg ? (
        <SvgXml xml={svg} width={size} height={size} />
      ) : failed ? (
        <View style={{ padding: 12 }} />
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </View>
  );
}
