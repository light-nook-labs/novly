import { Modal, Pressable, View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

interface AppInfoSheetProps {
  visible: boolean;
  onClose: () => void;
}

const REPO_URL = "https://github.com/light-nook-labs/novly";
const ISSUES_URL = "https://github.com/light-nook-labs/novly/issues";

const FEATURES = [
  { icon: "cloud-offline-outline" as const, title: "Offline-first", desc: "All novel metadata is bundled and browsable without network" },
  { icon: "library-outline" as const, title: "Full Library", desc: "Browse and filter by genre, status, contest and tags" },
  { icon: "search-outline" as const, title: "Instant Search", desc: "Search globally by title, author or ID with instant response" },
  { icon: "podium-outline" as const, title: "Multi Rankings", desc: "Clicks, words, favorites, praises, reviews and more" },
  { icon: "bookmark-outline" as const, title: "Local Bookshelf", desc: "Bookshelf stored in a private local database, persistent" },
  { icon: "link-outline" as const, title: "Open in SFACG", desc: "Jump to the SFACG app or website to read the original" },
];

const STACK = ["React Native", "Expo SDK 57", "TypeScript", "expo-sqlite"];

export function AppInfoSheet({ visible, onClose }: AppInfoSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />

          {/* Logo & version */}
          <View style={styles.logoSection}>
            <Image source={require("../assets/icon.png")} style={styles.logo} />
            <Text style={[styles.appName, { color: colors.text }]}>Novly</Text>
            <Text style={[styles.version, { color: colors.textSecondary }]}>v1.0.0</Text>
            <Text style={[styles.tagline, { color: colors.textTertiary }]}>Offline-first novel metadata browser</Text>
          </View>

          {/* Features */}
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {FEATURES.map((f, index) => (
              <View key={f.title}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />}
                <View style={styles.featureRow}>
                  <View style={[styles.featureIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Ionicons name={f.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                    <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Tech stack */}
            <Text style={[styles.stackTitle, { color: colors.textSecondary }]}>Tech Stack</Text>
            <View style={styles.stackRow}>
              {STACK.map((s) => (
                <View key={s} style={[styles.stackChip, { backgroundColor: colors.surfaceBorder }]}>
                  <Text style={[styles.stackChipText, { color: colors.textSecondary }]}>{s}</Text>
                </View>
              ))}
            </View>

            {/* AI assistance */}
            <Text style={[styles.aiHint, { color: colors.textTertiary }]}>
              Developed with the assistance of OpenCode & AtomCode AI
            </Text>
          </ScrollView>

          {/* Support */}
          <View style={[styles.supportSection, { borderTopColor: colors.surfaceBorder }]}>
            <Text style={[styles.supportTitle, { color: colors.textSecondary }]}>Support the project</Text>
            <View style={styles.supportRow}>
              <TouchableOpacity
                style={styles.supportItem}
                onPress={() => Linking.openURL(ISSUES_URL)}
                activeOpacity={0.7}
              >
                <Ionicons name="bug-outline" size={18} color={colors.danger} />
                <Text style={[styles.supportText, { color: colors.text }]}>Report Bug</Text>
              </TouchableOpacity>
              <View style={[styles.supportDivider, { backgroundColor: colors.surfaceBorder }]} />
              <TouchableOpacity
                style={styles.supportItem}
                onPress={() => Linking.openURL(REPO_URL)}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={18} color="#F5A623" />
                <Text style={[styles.supportText, { color: colors.text }]}>Give a Star</Text>
              </TouchableOpacity>
              <View style={[styles.supportDivider, { backgroundColor: colors.surfaceBorder }]} />
              <TouchableOpacity
                style={styles.supportItem}
                onPress={() => Linking.openURL(`${REPO_URL}/pulls`)}
                activeOpacity={0.7}
              >
                <Ionicons name="git-pull-request-outline" size={18} color={colors.success} />
                <Text style={[styles.supportText, { color: colors.text }]}>Submit PR</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.supportHint, { color: colors.textTertiary }]}>
              If you like Novly, give it a star and feel free to contribute via pull requests
            </Text>
          </View>

          {/* Close */}
          <View style={[styles.footer, { borderTopColor: colors.surfaceBorder }]}>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primary }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeText}>Close</Text>
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
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.sm,
  },
  logoSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  appName: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
  },
  version: {
    fontSize: FontSize.sm,
  },
  tagline: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  featureDesc: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  stackTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  stackRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  stackChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.xl,
  },
  stackChipText: {
    fontSize: FontSize.sm,
  },
  aiHint: {
    fontSize: FontSize.xs,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  supportSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  supportTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  supportItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  supportDivider: {
    width: 1,
    height: 20,
  },
  supportText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  supportHint: {
    fontSize: FontSize.xs,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  closeBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#fff",
  },
});
