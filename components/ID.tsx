import { Text, StyleSheet, type TextStyle } from "react-native";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { FontSize } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

interface IDProps {
  id: number;
  onPress?: () => void;
  /** 与相邻标题保持一致的字重,避免安卓上不同字重导致基线不对齐 */
  weight?: TextStyle["fontWeight"];
}

export function ID({ id, onPress, weight }: IDProps) {
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

  // 用 Text + onPress 而非 TouchableOpacity:ID 常嵌套在标题 Text 内,
  // 内嵌块级 View 在安卓上会导致行框/基线偏移(顶部高出半个字高)
  return (
    <Text
      onPress={handlePress}
      style={[styles.id, { color: colors.textTertiary }, weight != null && { fontWeight: weight }]}
    >
      #{id}
    </Text>
  );
}

const styles = StyleSheet.create({
  id: {
    fontSize: FontSize.md,
    fontWeight: "400",
  },
});
