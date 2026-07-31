import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { FontSize, Spacing } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

/** 统一的页面级加载指示:居中转圈,可选文案(默认纯转圈) */
export function Loading({ message }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message != null && (
        <Text style={[styles.text, { color: colors.textTertiary }]}>{message}</Text>
      )}
    </View>
  );
}

/** 列表底部"加载更多"指示:小号转圈 */
export function LoadingFooter() {
  const { colors } = useTheme();
  return (
    <View style={styles.footer}>
      <ActivityIndicator size="small" color={colors.primary} />
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
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
});
