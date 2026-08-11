import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { ICONS } from "../constants/icons";
import { useTheme } from "./ThemeProvider";

interface InfoSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * 底部说明弹层:一个小 tip 图标触发,点开后从底部滑出解释文字。
 * 内容由 InfoBody(段落)/InfoItem(要点) 组合传入,如设置页"为什么开发 Novly?"、首页"完本推荐"逻辑说明。
 */
export function InfoSheet({ visible, onClose, title, children }: InfoSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay + "66" }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name={ICONS.close} size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function InfoBody({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.body, { color: colors.textSecondary }]}>{children}</Text>;
}

export function InfoItem({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.item, { color: colors.textSecondary }]}>• {children}</Text>;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "85%",
    paddingBottom: Spacing.xl,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  body: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  item: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginTop: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
});
