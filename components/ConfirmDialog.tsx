import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "确认",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.dialog, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: (danger ? colors.danger : colors.primary) + "15" }]}>
            <Ionicons
              name={danger ? "warning-outline" : "help-circle-outline"}
              size={28}
              color={danger ? colors.danger : colors.primary}
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { backgroundColor: colors.surfaceBorder }]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: danger ? colors.danger : colors.primary }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  dialog: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: FontSize.sm,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
    alignSelf: "stretch",
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {},
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  confirmText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#fff",
  },
});
