import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./ThemeProvider";

interface BackToTopProps {
  onPress: () => void;
}

/** 统一的返回顶部悬浮按钮(所有列表页共用,样式保持一致) */
export function BackToTop({ onPress }: BackToTopProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.btn, { backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="arrow-up" size={20} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    elevation: 4,
  },
});
