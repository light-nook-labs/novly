import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSize, Spacing, BorderRadius } from "../constants/theme";

interface SearchBarProps {
  placeholder?: string;
  /** Tappable mode: navigates to full search page */
  onPress?: () => void;
  /** Input mode: controlled value */
  value?: string;
  /** Input mode: change handler */
  onChangeText?: (text: string) => void;
}

export function SearchBar({
  placeholder = "搜索...",
  onPress,
  value,
  onChangeText,
}: SearchBarProps) {
  const isInputMode = value !== undefined && onChangeText !== undefined;

  if (isInputMode) {
    return (
      <View style={styles.bar}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Tappable placeholder mode
  return (
    <TouchableOpacity
      style={styles.bar}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
      <Text style={styles.placeholder}>{placeholder}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceBorder,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    height: 40,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    padding: 0,
  },
  placeholder: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
});
