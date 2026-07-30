import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius } from "../constants/theme";
import { coverUrl } from "../utils/urls";

interface CoverProps {
  cover: string | null;
  width?: number;
  height?: number;
  borderRadius?: number;
}

export function Cover({ cover, width = 48, height = 64, borderRadius = BorderRadius.sm }: CoverProps) {
  const uri = coverUrl(cover);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width, height, borderRadius }]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.fallback, { width, height, borderRadius }]}>
      <Ionicons name="book-outline" size={Math.min(width, height) * 0.4} color={Colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.surfaceBorder,
  },
  fallback: {
    backgroundColor: Colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
  },
});
