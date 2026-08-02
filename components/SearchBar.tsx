import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

interface SearchBarProps {
  placeholder?: string;
  /** Tappable mode: navigates to full search page */
  onPress?: () => void;
  /** Input mode: controlled value */
  value?: string;
  /** Input mode: change handler */
  onChangeText?: (text: string) => void;
}

export function SearchBar({ placeholder = "搜索...", onPress, value, onChangeText }: SearchBarProps) {
  const { colors } = useTheme();
  const isInputMode = value !== undefined && onChangeText !== undefined;

  if (isInputMode) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.surfaceBorder }]}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Tappable placeholder mode
  return (
    <TouchableOpacity
      style={[styles.bar, { backgroundColor: colors.surfaceBorder }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
      <Text style={[styles.placeholder, { color: colors.textTertiary }]}>{placeholder}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    height: 40,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
    padding: 0,
  },
  placeholder: {
    fontSize: FontSize.md,
    fontWeight: "600",
    paddingHorizontal: 2,
  },
});
