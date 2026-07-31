import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius } from "../constants/theme";
import { coverUrl } from "../utils/urls";
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
