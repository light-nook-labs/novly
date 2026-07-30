import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSize, Spacing } from "../constants/theme";

interface PageHeaderProps {
  title: string;
  search?: string;
  setSearch?: (v: string) => void;
  onSearchPress?: () => void;
  right?: React.ReactNode;
}

export function PageHeader({ title, search, setSearch, onSearchPress, right }: PageHeaderProps) {
  const [searchVisible, setSearchVisible] = useState(false);

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
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleBackPress}
        onLongPress={handleBackLongPress}
        activeOpacity={0.7}
        delayLongPress={500}
      >
        <Ionicons
          name={searchVisible ? "close" : "chevron-back"}
          size={24}
          color={Colors.text}
        />
      </TouchableOpacity>

      {searchVisible && setSearch ? (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}

      {!searchVisible && (
        <View style={styles.rightSection}>
          {setSearch && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSearchPress}
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={24} color={Colors.text} />
            </TouchableOpacity>
          )}
          {right}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
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
    color: Colors.text,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    padding: 0,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
});
