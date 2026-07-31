import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  message?: string;
}

export function EmptyState({ icon = "folder-open-outline", message = "暂无数据" }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={[styles.text, { color: colors.textTertiary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    gap: Spacing.md,
  },
  text: {
    fontSize: FontSize.md,
  },
});
