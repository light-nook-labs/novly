import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

interface NoteCardProps {
  children: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** 页面顶部的信息提示卡片(说明排序规则/数据含义等),全站复用 */
export function NoteCard({ children, icon = "information-circle-outline" }: NoteCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.primary + "0D" }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

/** 提示文字中的强调片段(高亮 + 加粗) */
export function NoteStrong({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.strong, { color: colors.primary }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  text: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  strong: {
    fontWeight: "700",
  },
});
