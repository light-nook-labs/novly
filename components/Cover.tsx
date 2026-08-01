import { View, Image, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius } from "../constants/theme";
import { coverUrl } from "../utils/urls";
import { delayImageLoad } from "../utils/imageDelay";
import { ImageShimmer } from "./ImageShimmer";
import { useTheme } from "./ThemeProvider";

interface CoverProps {
  cover: string | null;
  width?: number;
  height?: number;
  borderRadius?: number;
}

export function Cover({ cover, width = 48, height = 64, borderRadius = BorderRadius.sm }: CoverProps) {
  const { colors } = useTheme();
  const uri = coverUrl(cover);
  const [ready, setReady] = useState(false);

  // 人为延迟加载(便于测试加载动画);上线置 0 后立即 ready
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (!uri) return;
    delayImageLoad().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (uri && !ready) {
    return <ImageShimmer width={width} height={height} borderRadius={borderRadius} />;
  }

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width, height, borderRadius, backgroundColor: colors.surfaceBorder }]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.fallback, { width, height, borderRadius, backgroundColor: colors.surfaceBorder }]}>
      <Ionicons name="book-outline" size={Math.min(width, height) * 0.4} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  fallback: {
    justifyContent: "center",
    alignItems: "center",
  },
});
