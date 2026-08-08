import { useEffect, useState } from "react";
import { Animated, StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import { BorderRadius, Spacing } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

/** 单个骨架占位块(呼吸动画) */
export function SkeletonBlock({
  width,
  height,
  radius = BorderRadius.sm,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的挂载执行)
  }, []);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, opacity, backgroundColor: colors.surfaceBorder }, style]}
    />
  );
}

/** 详情页骨架:封面 + 标题行 + 统计网格 + 文本段落 */
export function DetailSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <SkeletonBlock width={100} height={140} radius={BorderRadius.md} />
        <View style={styles.heroInfo}>
          <SkeletonBlock width="100%" height={22} />
          <SkeletonBlock width="70%" height={16} />
          <SkeletonBlock width="50%" height={14} />
        </View>
      </View>
      <View style={styles.statsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.statItem}>
            <SkeletonBlock width={40} height={16} />
            <SkeletonBlock width={28} height={12} />
          </View>
        ))}
      </View>
      <View style={styles.paragraph}>
        <SkeletonBlock width="100%" height={14} />
        <SkeletonBlock width="90%" height={14} />
        <SkeletonBlock width="60%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    flexDirection: "row",
    gap: Spacing.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: "transparent",
  },
  heroInfo: {
    flex: 1,
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  paragraph: {
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
});
