import { View, Image, StyleSheet, Text } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { SearchBar } from "./SearchBar";
import { FontSize, Spacing } from "../constants/theme";
import { useTheme } from "./ThemeProvider";
import { subscribeInitProgress, initProgress } from "../utils/database";

interface TabHeaderProps {
  /** Enable input mode (controlled) */
  search?: string;
  setSearch?: (v: string) => void;
  placeholder?: string;
  /** Custom tappable search press (default: push /search) */
  onSearchPress?: () => void;
  /** Right-side action buttons */
  right?: React.ReactNode;
}

export function TabHeader({ search, setSearch, placeholder, onSearchPress, right }: TabHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isInputMode = search !== undefined && setSearch !== undefined;
  const [initText, setInitText] = useState<string | null>(initProgress);

  // 数据库后台初始化(如解压冷数据)时,在 header 底部显示进度;完成后恢复普通 header
  useEffect(() => {
    return subscribeInitProgress(setInitText);
  }, []);

  return (
    <View style={[styles.headerWrap, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + Spacing.sm }]}>
        <Image source={require("../assets/icon.png")} style={styles.icon} />
        {isInputMode ? (
          <SearchBar value={search} onChangeText={setSearch} placeholder={placeholder} />
        ) : (
          <SearchBar onPress={onSearchPress ?? (() => router.push("/search"))} placeholder={placeholder} />
        )}
        {right}
      </View>

      {/* 数据库初始化进度条(解压冷数据时显示,完成后恢复普通 header) */}
      {initText && (
        <View style={[styles.progressRow, { backgroundColor: colors.primary + "12" }]}>
          <Text style={[styles.progressText, { color: colors.primary }]} numberOfLines={1}>
            {initText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  progressRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
  },
  progressText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    textAlign: "center",
  },
});
