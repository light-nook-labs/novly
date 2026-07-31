import { Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { FontSize } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

interface IDProps {
  id: number;
  onPress?: () => void;
}

export function ID({ id, onPress }: IDProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    Clipboard.setStringAsync(String(id));
    Toast.show({
      type: "success",
      text1: "已复制ID",
      text2: `ID: ${id}`,
      position: "top",
    });
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text style={[styles.id, { color: colors.textTertiary }]}>#{id}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  id: {
    fontSize: FontSize.md,
    fontWeight: "400",
  },
});
