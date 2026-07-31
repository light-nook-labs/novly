import { View, Text, StyleSheet } from "react-native";
import { FontSize } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

type BadgeVariant = "status" | "genre" | "ptype" | "accent";

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

export function Badge({ label, variant }: BadgeProps) {
  const { colors } = useTheme();
  const VARIANT_STYLES: Record<BadgeVariant, { bg: string; fg: string; border: string }> = {
    status: { bg: colors.primaryLight, fg: colors.primary, border: colors.primary + "30" },
    genre: { bg: colors.primaryLight, fg: colors.primary, border: colors.primary + "30" },
    ptype: { bg: "#26A69A15", fg: "#26A69A", border: "#26A69A30" },
    accent: { bg: "#FF6B6B15", fg: colors.danger, border: colors.danger + "30" },
  };
  const style = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Text style={[styles.text, { color: style.fg }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ statusId, label }: { statusId: number; label: string }) {
  const { colors } = useTheme();
  const STATUS_COLORS: Record<number, string> = {
    3: colors.success,
    2: colors.primary,
    6: colors.primary,
  };
  const fg = STATUS_COLORS[statusId] ?? colors.textTertiary;
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
