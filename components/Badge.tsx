import { View, Text, StyleSheet } from "react-native";
import { FontSize } from "../constants/theme";
import { useTheme, type ThemeColors } from "./ThemeProvider";

// 全局枚举→颜色绑定(以 NovelRow 为准):status badge 颜色唯一来源
// 3=连载中 success, 2=已完结 / 6=完结A primary, 其余 textTertiary
export function statusColor(colors: ThemeColors, statusId: number): string {
  const STATUS_COLORS: Record<number, string> = {
    3: colors.success,
    2: colors.primary,
    6: colors.primary,
  };
  return STATUS_COLORS[statusId] ?? colors.textTertiary;
}

// 全局 tag 徽章颜色(枚举风格:主题色 + 15% 底/30% 边,高对比且与 UI 一致;按小说内下标取色,≤6 个互不相同)
export function tagColor(colors: ThemeColors, index: number): string {
  const palette = [
    colors.primary,
    colors.success,
    colors.danger,
    colors.info,
    colors.textSecondary,
    colors.textMuted,
  ];
  return palette[index % palette.length];
}

type BadgeVariant = "status" | "genre" | "ptype" | "accent" | "tag";

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  color?: string; // 枚举风格覆盖:fg 主题色(自动 15% 底/30% 边,如 tag 按下标取色)
}

export function Badge({ label, variant, color }: BadgeProps) {
  const { colors } = useTheme();
  const VARIANT_STYLES: Record<BadgeVariant, { bg: string; fg: string; border: string }> = {
    status: { bg: colors.primaryLight, fg: colors.primary, border: colors.primary + "30" },
    genre: { bg: colors.primaryLight, fg: colors.primary, border: colors.primary + "30" },
    ptype: { bg: "#26A69A15", fg: "#26A69A", border: "#26A69A30" },
    accent: { bg: "#FF6B6B15", fg: colors.danger, border: colors.danger + "30" },
    tag: { bg: colors.primaryLight, fg: colors.primary, border: colors.primary + "30" },
  };
  const base = VARIANT_STYLES[variant];
  const fg = color ?? base.fg;
  const bg = color ? fg + "15" : base.bg;
  const border = color ? fg + "30" : base.border;
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ statusId, label }: { statusId: number; label: string }) {
  const { colors } = useTheme();
  const fg = statusColor(colors, statusId);
  return (
    <View style={[styles.badge, { backgroundColor: fg + "15", borderColor: fg + "30" }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: "500",
  },
});
