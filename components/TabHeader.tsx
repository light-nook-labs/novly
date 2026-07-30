import { View, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SearchBar } from "./SearchBar";
import { Colors, Spacing } from "../constants/theme";

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

export function TabHeader({
  search,
  setSearch,
  placeholder,
  onSearchPress,
  right,
}: TabHeaderProps) {
  const isInputMode = search !== undefined && setSearch !== undefined;

  return (
    <View style={styles.header}>
      <Image source={require("../assets/icon.png")} style={styles.icon} />
      {isInputMode ? (
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={placeholder}
        />
      ) : (
        <SearchBar
          onPress={onSearchPress ?? (() => router.push("/search"))}
          placeholder={placeholder}
        />
      )}
      {right}
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
  icon: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
});
