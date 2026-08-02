import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { Spacing, BorderRadius, FontSize } from "../constants/theme";

/** 分类 tab 定义(全部/免费/签约/VIP),novels 与各详情页共用 */
export const PTYPES = [
  { key: null, label: "全部", icon: "list-outline" as const },
  { key: 2, label: "免费", icon: "gift-outline" as const },
  { key: 3, label: "签约", icon: "ribbon-outline" as const },
  { key: 4, label: "VIP", icon: "diamond-outline" as const },
];

export type PtypeKey = number | null;

interface PtypeTabsProps {
  selected: PtypeKey;
  onSelect: (key: PtypeKey) => void;
  /** 各 tab 计数(可选,如 novels 的 ptype 数量) */
  counts?: Record<string, number>;
}

/** 统一的分类 head tab 条:激活高亮 + 500ms 防抖 + 激活 tab 点击忽略 */
export function PtypeTabs({ selected, onSelect, counts }: PtypeTabsProps) {
  const { colors } = useTheme();
  const lastTapRef = useRef(0);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={styles.tabBar}
    >
      {PTYPES.map((ptype) => {
        const active = selected === ptype.key;
        const count = counts?.[ptype.key === null ? "all" : String(ptype.key)];
        return (
          <TouchableOpacity
            key={ptype.key?.toString() ?? "all"}
            style={[
              styles.tab,
              { backgroundColor: colors.surfaceBorder },
              active && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              if (selected === ptype.key) return; // 激活 tab 点击忽略
              const now = Date.now();
              if (now - lastTapRef.current < 500) return; // 500ms 防抖
              lastTapRef.current = now;
              onSelect(ptype.key);
            }}
          >
            <View style={styles.tabContent}>
              <Ionicons name={ptype.icon} size={15} color={active ? "#fff" : colors.textSecondary} />
              <Text style={[styles.tabText, { color: active ? "#fff" : colors.textSecondary }]} numberOfLines={1}>
                {ptype.label}
                {active && count != null ? ` ${count}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    height: 40, // 固定高度,激活显示 count 时容器不变形
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
