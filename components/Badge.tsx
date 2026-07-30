import { View, Text, StyleSheet } from "react-native";
import { Colors, FontSize } from "../constants/theme";

type BadgeVariant = "status" | "genre" | "ptype" | "accent";

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; fg: string; border: string }> = {
  status: { bg: Colors.primaryLight, fg: Colors.primary, border: Colors.primary + "30" },
  genre: { bg: Colors.primaryLight, fg: Colors.primary, border: Colors.primary + "30" },
  ptype: { bg: "#26A69A15", fg: "#26A69A", border: "#26A69A30" },
  accent: { bg: "#FF6B6B15", fg: Colors.danger, border: Colors.danger + "30" },
};

export function Badge({ label, variant }: BadgeProps) {
  const style = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Text style={[styles.text, { color: style.fg }]}>{label}</Text>
    </View>
  );
}

const STATUS_COLORS: Record<number, string> = {
  3: Colors.success,
  2: Colors.primary,
  6: Colors.primary,
};

export function StatusBadge({ statusId, label }: { statusId: number; label: string }) {
  const fg = STATUS_COLORS[statusId] ?? Colors.textTertiary;
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
