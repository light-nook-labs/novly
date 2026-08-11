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
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { FontSize, Spacing, BorderRadius, Layout } from "../constants/theme";
import { PageHeader } from "../components/Header";
import { InfoSheet, InfoBody, InfoItem } from "../components/InfoSheet";
import { ICONS } from "../constants/icons";
import { useTheme, type ThemeColors } from "../components/ThemeProvider";
import { APP_GITHUB_URL, APP_ISSUES_URL, APP_VERSION, APP_FEATURES, APP_STACK, APP_NAME } from "../constants/appInfo";
import { loadWhyText, parseWhyMarkdown, type WhyBlock } from "../utils/whyContent";
const EMAIL = "intersetwq@gmail.com";

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
    whyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.primaryLight,
    },
    whyText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
    },
    logoSection: {
      alignItems: "center",
      paddingVertical: Spacing.xl,
      gap: Spacing.xs,
    },
    logo: {
      width: Layout.iconLg,
      height: Layout.iconLg,
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
  const [showContribute, setShowContribute] = useState(true);
  const [whyVisible, setWhyVisible] = useState(false); // Why {APP_NAME}? 说明弹层
  // Why 内容:从 WHY_TEXT 常量解析(纯文本维护,改 whyContent.ts 即可)
  const [whyBlocks] = useState<WhyBlock[]>(() => parseWhyMarkdown(loadWhyText()));

  return (
    <View style={styles.container}>
      <PageHeader title="About" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo & version */}
        <View style={styles.logoSection}>
          <Image source={require("../assets/icon.png")} style={styles.logo} />
          <Text textBreakStrategy="simple" style={styles.appName}>
            {APP_NAME}
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
            {APP_FEATURES.map((f, index) => (
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
            {APP_STACK.map((s) => (
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
              onPress={() => Linking.openURL(APP_ISSUES_URL)}
              activeOpacity={0.7}
            >
              <Ionicons name={ICONS.bug} size={18} color={colors.danger} />
              <Text style={styles.supportText}>Report Bug</Text>
            </TouchableOpacity>
            <View style={styles.supportDivider} />
            <TouchableOpacity style={styles.supportItem} onPress={() => Linking.openURL(APP_GITHUB_URL)} activeOpacity={0.7}>
              <Ionicons name={ICONS.star} size={18} color={colors.starGold} />
              <Text style={styles.supportText}>Give a Star</Text>
            </TouchableOpacity>
            <View style={styles.supportDivider} />
            <TouchableOpacity
              style={styles.supportItem}
              onPress={() => Linking.openURL(`${APP_GITHUB_URL}/pulls`)}
              activeOpacity={0.7}
            >
              <Ionicons name={ICONS.pr} size={18} color={colors.success} />
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
            <Ionicons name={ICONS.mail} size={18} color={colors.primary} />
            <Text textBreakStrategy="simple" style={styles.emailText}>
              {EMAIL}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.whyBtn} onPress={() => setWhyVisible(true)} activeOpacity={0.7}>
            <Ionicons name={ICONS.tip} size={16} color={colors.primary} />
            <Text style={[styles.whyText, { color: colors.primary }]}>Why {APP_NAME}?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 贡献提示弹窗 */}
      <Modal visible={showContribute} transparent animationType="fade" onRequestClose={() => setShowContribute(false)}>
        <Pressable style={[styles.contributeBackdrop, { backgroundColor: colors.overlay + "80" }]} onPress={() => setShowContribute(false)}>
          <Pressable style={[styles.contributeCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={[styles.contributeIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name={ICONS.like} size={30} color={colors.primary} />
            </View>
            <Text style={[styles.contributeTitle, { color: colors.text }]}>支持 {APP_NAME}</Text>
            <Text style={[styles.contributeText, { color: colors.textSecondary }]}>
              如果你喜欢 {APP_NAME},欢迎点亮 Star、提交 PR 或创建 Issue,帮助我们做得更好
            </Text>
            <View style={styles.contributeActions}>
              <TouchableOpacity
                style={[styles.contributeAction, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Linking.openURL(APP_GITHUB_URL);
                  setShowContribute(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name={ICONS.star} size={16} color="#fff" />
                <Text style={styles.contributeActionText}>Star 仓库</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contributeAction, { backgroundColor: colors.surfaceBorder }]}
                onPress={() => {
                  Linking.openURL(APP_ISSUES_URL);
                  setShowContribute(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name={ICONS.bug} size={16} color={colors.danger} />
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
      {/* Why {APP_NAME} 弹窗(复用 InfoSheet 组件,内容来自 utils/whyContent.ts 的 WHY_TEXT 常量) */}
      <InfoSheet visible={whyVisible} onClose={() => setWhyVisible(false)} title={`为什么开发 ${APP_NAME}?`}>
        {whyBlocks.map((block, i) =>
          block.bullet ? (
            <InfoItem key={i}>{block.text}</InfoItem>
          ) : (
            <InfoBody key={i}>{block.text}</InfoBody>
          ),
        )}
      </InfoSheet>
    </View>
  );
}
