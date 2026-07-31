import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";
import { subscribeInitProgress, initProgress } from "../utils/database";

interface PageHeaderProps {
  title: string;
  titleAppend?: string;
  search?: string;
  setSearch?: (v: string) => void;
  onSearchPress?: () => void;
  right?: React.ReactNode;
}

export function PageHeader({ title, titleAppend, search, setSearch, onSearchPress, right }: PageHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchVisible, setSearchVisible] = useState(false);
  const [initText, setInitText] = useState<string | null>(null);

  // 数据库后台初始化(如解压冷数据)时,在 header 底部显示进度;完成后恢复普通 header
  useEffect(() => {
    setInitText(initProgress);
    return subscribeInitProgress(setInitText);
  }, []);

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    } else if (setSearch) {
      setSearchVisible(true);
    }
  };

  const handleBackPress = () => {
    if (searchVisible) {
      setSearchVisible(false);
      setSearch?.("");
    } else {
      if (router.canGoBack()) {
        router.back();
      }
    }
  };

  const handleBackLongPress = () => {
    if (searchVisible) {
      setSearchVisible(false);
      setSearch?.("");
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.headerWrap, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={styles.iconButton}
          onPress={handleBackPress}
          onLongPress={handleBackLongPress}
          delayLongPress={500}
        >
          <Ionicons
            name={searchVisible ? "close" : "chevron-back"}
            size={24}
            color={colors.text}
          />
        </Pressable>

        {searchVisible && setSearch ? (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, backgroundColor: colors.surfaceBorder }]}
              placeholder="搜索..."
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
        ) : (
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
            {titleAppend && <Text style={[styles.titleAppend, { color: colors.textTertiary }]}> {titleAppend}</Text>}
          </Text>
        )}

        {!searchVisible && (
          <View style={styles.rightSection}>
            {(setSearch || onSearchPress) && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleSearchPress}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
            {right}
          </View>
        )}
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
  progressRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  progressText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    textAlign: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: "bold",
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 0,
  },
  titleAppend: {
    fontSize: FontSize.sm,
    marginLeft: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
});
