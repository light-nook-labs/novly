import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  message?: string;
  /** 提供时显示重试按钮(加载失败引导) */
  onRetry?: () => void;
}

export function EmptyState({ icon = "folder-open-outline", message = "暂无数据", onRetry }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={[styles.text, { color: colors.textTertiary }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.surfaceBorder }]}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={[styles.retryText, { color: colors.primary }]}>重试</Text>
        </TouchableOpacity>
      )}
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
    alignSelf: "stretch",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
