import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { useMemo, useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { PageHeader } from "../components/Header";
import { useTheme, type ThemeColors } from "../components/ThemeProvider";
import { APP_VERSION } from "../constants/appInfo";

const REPO_URL = "https://github.com/light-nook-labs/novly";
const ISSUES_URL = "https://github.com/light-nook-labs/novly/issues";
const EMAIL = "intersetwq@gmail.com";

const FEATURES = [
  {
    icon: "cloud-offline-outline" as const,
    title: "Offline-first",
    desc: "All novel metadata is bundled and browsable without network",
  },
  {
    icon: "library-outline" as const,
    title: "Full Library",
    desc: "Browse and filter by genre, status, contest and tags",
  },
  {
    icon: "search-outline" as const,
    title: "Instant Search",
    desc: "Search globally by title, author or ID with instant response",
  },
  {
    icon: "podium-outline" as const,
    title: "Multi Rankings",
    desc: "Clicks, words, favorites, praises, reviews and more",
  },
  {
    icon: "bookmark-outline" as const,
    title: "Local Bookshelf",
    desc: "Bookshelf stored in a private local database, persistent",
  },
  {
    icon: "link-outline" as const,
    title: "Open in SFACG",
    desc: "Jump to the SFACG app or website to read the original",
  },
];

const STACK = ["React Native", "Expo SDK 57", "TypeScript", "expo-sqlite"];

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor: colors.background,
    },
    content: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xl * 2,
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
      color: colors.text,
      alignSelf: "stretch",
      textAlign: "center",
    },
    version: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      alignSelf: "stretch",
      textAlign: "center",
    },
    tagline: {
      fontSize: FontSize.sm,
      marginTop: Spacing.xs,
      color: colors.textTertiary,
      alignSelf: "stretch",
      textAlign: "center",
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.lg,
      padding: Spacing.lg,
    },
    sectionTitle: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 1,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.surfaceBorder,
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
      backgroundColor: colors.primaryLight,
    },
    featureInfo: {
      flex: 1,
    },
    featureTitle: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    featureDesc: {
      fontSize: FontSize.sm,
      marginTop: 2,
      color: colors.textSecondary,
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
      backgroundColor: colors.surfaceBorder,
    },
    stackChipText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: colors.textSecondary,
      paddingHorizontal: 2,
    },
    aiHint: {
      fontSize: FontSize.xs,
      marginTop: Spacing.lg,
      textAlign: "center",
      color: colors.textTertiary,
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
      backgroundColor: colors.surfaceBorder,
    },
    supportText: {
      fontSize: FontSize.sm,
      fontWeight: "500",
      color: colors.text,
    },
    supportHint: {
      fontSize: FontSize.xs,
      textAlign: "center",
      marginTop: Spacing.sm,
      color: colors.textTertiary,
    },
    emailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.xs,
      marginTop: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    emailText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: colors.primary,
    },
    contributeBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.xl,
    },
    contributeCard: {
      width: "100%",
      maxWidth: 340,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      alignItems: "center",
    },
    contributeIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Spacing.md,
    },
    contributeTitle: {
      fontSize: FontSize.xl,
      fontWeight: "700",
      marginBottom: Spacing.sm,
      alignSelf: "stretch",
      textAlign: "center",
    },
    contributeText: {
      fontSize: FontSize.md,
      lineHeight: 22,
      marginBottom: Spacing.lg,
      alignSelf: "stretch",
      textAlign: "center",
    },
    contributeActions: {
      flexDirection: "row",
      gap: Spacing.md,
      alignSelf: "stretch",
    },
    contributeAction: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: Spacing.xs,
      height: 44,
      borderRadius: BorderRadius.md,
    },
    contributeActionText: {
      fontSize: FontSize.md,
      fontWeight: "700",
      color: "#fff",
    },
    contributeLater: {
      marginTop: Spacing.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
    contributeLaterText: {
      fontSize: FontSize.sm,
    },
  });
}

export default function AboutScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showContribute, setShowContribute] = useState(false);

  // 进入 About 路由时弹出贡献提示(鼓励 star / PR / issue)
  useEffect(() => {
    setShowContribute(true);
  }, []);

  return (
    <View style={styles.container}>
      <PageHeader title="About" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo & version */}
        <View style={styles.logoSection}>
          <Image source={require("../assets/icon.png")} style={styles.logo} />
          <Text textBreakStrategy="simple" style={styles.appName}>
            Novly
          </Text>
          <Text textBreakStrategy="simple" style={styles.version}>
            v{APP_VERSION}
          </Text>
          <Text textBreakStrategy="simple" style={styles.tagline}>
            Offline-first novel metadata browser
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={Platform.OS === "web" ? { flexDirection: "row", flexWrap: "wrap" } : undefined}>
            {FEATURES.map((f, index) => (
              <View
                key={f.title}
                style={
                  Platform.OS === "web" ? { width: "50%", paddingRight: (index + 1) % 2 !== 0 ? 16 : 0 } : undefined
                }
              >
                {index > 0 && Platform.OS !== "web" && <View style={styles.divider} />}
                <View style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tech stack */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tech Stack</Text>
          <View style={styles.stackRow}>
            {STACK.map((s) => (
              <View key={s} style={styles.stackChip}>
                <Text style={styles.stackChipText}>{s}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.aiHint}>Developed with the assistance of OpenCode & AtomCode AI</Text>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support the project</Text>
          <View style={styles.supportRow}>
            <TouchableOpacity
              style={styles.supportItem}
              onPress={() => Linking.openURL(ISSUES_URL)}
              activeOpacity={0.7}
            >
              <Ionicons name="bug-outline" size={18} color={colors.danger} />
              <Text style={styles.supportText}>Report Bug</Text>
            </TouchableOpacity>
            <View style={styles.supportDivider} />
            <TouchableOpacity style={styles.supportItem} onPress={() => Linking.openURL(REPO_URL)} activeOpacity={0.7}>
              <Ionicons name="star-outline" size={18} color="#F5A623" />
              <Text style={styles.supportText}>Give a Star</Text>
            </TouchableOpacity>
            <View style={styles.supportDivider} />
            <TouchableOpacity
              style={styles.supportItem}
              onPress={() => Linking.openURL(`${REPO_URL}/pulls`)}
              activeOpacity={0.7}
            >
              <Ionicons name="git-pull-request-outline" size={18} color={colors.success} />
              <Text style={styles.supportText}>Submit PR</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.emailRow}
            onPress={() => Linking.openURL(`mailto:${EMAIL}`)}
            onLongPress={() => {
              Clipboard.setStringAsync(EMAIL);
              Toast.show({
                type: "success",
                text1: "已复制Email",
                text2: EMAIL,
                position: "top",
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text textBreakStrategy="simple" style={styles.emailText}>
              {EMAIL}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 贡献提示弹窗 */}
      <Modal visible={showContribute} transparent animationType="fade" onRequestClose={() => setShowContribute(false)}>
        <Pressable style={styles.contributeBackdrop} onPress={() => setShowContribute(false)}>
          <Pressable style={[styles.contributeCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={[styles.contributeIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="heart-outline" size={30} color={colors.primary} />
            </View>
            <Text style={[styles.contributeTitle, { color: colors.text }]}>支持 Novly</Text>
            <Text style={[styles.contributeText, { color: colors.textSecondary }]}>
              如果你喜欢 Novly,欢迎点亮 Star、提交 PR 或创建 Issue,帮助我们做得更好
            </Text>
            <View style={styles.contributeActions}>
              <TouchableOpacity
                style={[styles.contributeAction, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Linking.openURL(REPO_URL);
                  setShowContribute(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="star-outline" size={16} color="#fff" />
                <Text style={styles.contributeActionText}>Star 仓库</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contributeAction, { backgroundColor: colors.surfaceBorder }]}
                onPress={() => {
                  Linking.openURL(ISSUES_URL);
                  setShowContribute(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="bug-outline" size={16} color={colors.danger} />
                <Text style={[styles.contributeActionText, { color: colors.danger }]}>提 Issue</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.contributeLater}
              onPress={() => setShowContribute(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.contributeLaterText, { color: colors.textTertiary }]}>以后再说</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
