import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform, Modal, Pressable } from "react-native";

import { useState, useEffect, useMemo } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { getDatabase, reinitDatabase, subscribeInitProgress, subscribeColdMerged } from "../utils/database";
import { clearBookshelf } from "../utils/bookshelfDb";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { PageHeader } from "../components/Header";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { InfoSheet, InfoBody, InfoItem } from "../components/InfoSheet";
import { loadWhyText, parseWhyMarkdown, type WhyBlock } from "../utils/whyContent";
import { fetchLatestRelease, compareVersions } from "../utils/updateApi";
import { ICONS } from "../constants/icons";
import { useTheme, type ThemeColors, type ThemeMode } from "../components/ThemeProvider";
import { APP_VERSION, APP_GITHUB_URL, APP_LICENSE_URL, APP_NOVEL_HUB_URL, APP_NOVEL_HUB_MOBILE_URL, APP_SLOGAN_EN, APP_NAME, APP_GITHUB_ORG, ghShortUrl } from "../constants/appInfo";

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: string }[] = [
  { key: "system", label: "跟随系统", icon: ICONS.systemMode },
  { key: "light", label: "浅色模式", icon: ICONS.lightMode },
  { key: "dark", label: "深色模式", icon: ICONS.darkMode },
];

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);
  const [stats, setStats] = useState({
    novels: 0,
    authors: 0,
    tags: 0,
    contests: 0,
  });
  const [themeVisible, setThemeVisible] = useState(false);
  const [whyVisible, setWhyVisible] = useState(false);
  // Why 内容:从 WHY_TEXT 常量解析(纯文本维护,改 whyContent.ts 即可)
  const [whyBlocks] = useState<WhyBlock[]>(() => parseWhyMarkdown(loadWhyText()));
  const [confirmTarget, setConfirmTarget] = useState<"bookshelf" | "reset" | null>(null);
  // 版本更新检查弹窗:new=有新版本(latest tag + release url),latest=已最新,error=拉取失败
  const [updateDialog, setUpdateDialog] = useState<{ kind: "new" | "latest" | "error"; tag?: string; url?: string } | null>(null);
  const [reinitializing, setReinitializing] = useState(false);
  const [reinitState, setReinitState] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- React Compiler 规则标记既有加载模式,数据更新为有意为之
    loadStats();
  }, []);

  // Reinit 期间订阅初始化进度与冷合并完成事件
  useEffect(() => {
    if (!reinitializing) return;
    const unsubMerge = subscribeColdMerged(() => {
      setReinitState("初始化完成");
      loadStats();
      setTimeout(() => {
        setReinitState(null);
        setReinitializing(false);
      }, 2000);
    });
    const unsubProgress = subscribeInitProgress((p) => {
      setReinitState(p ? `正在初始化: ${p}` : "正在重新初始化数据...");
    });
    return () => {
      unsubMerge();
      unsubProgress();
    };
  }, [reinitializing]);

  async function loadStats() {
    try {
      const db = await getDatabase();

      const novels = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM novels");
      const authors = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM authors");
      const tags = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM tags");
      const contests = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM contests");

      setStats({
        novels: novels?.count || 0,
        authors: authors?.count || 0,
        tags: tags?.count || 0,
        contests: contests?.count || 0,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }

  function handleClearBookshelf() {
    setConfirmTarget("bookshelf");
  }

  async function doClearBookshelf() {
    try {
      await clearBookshelf();
      Alert.alert("Done", "Bookshelf has been cleared.");
    } catch (error) {
      console.error("Failed to clear bookshelf:", error);
    }
  }

  function handleResetData() {
    setConfirmTarget("reset");
  }

  async function doResetData() {
    try {
      await AsyncStorage.clear();
      await clearBookshelf();
      setReinitializing(true);
      setReinitState("正在重新初始化数据...");
      await reinitDatabase();
    } catch (error) {
      console.error("Failed to reinit data:", error);
      setReinitializing(false);
      setReinitState(null);
    }
  }

  function handleOpenUrl(url: string) {
    Linking.openURL(url);
  }

  // 检查更新:从 GitHub Release 拉取最新版本并与本地版本比较
  const handleCheckUpdate = async () => {
    try {
      const release = await fetchLatestRelease();
      if (!release || !release.tagName) {
        setUpdateDialog({ kind: "error" });
        return;
      }
      const latestTag = release.tagName.replace(/^v/i, "");
      if (compareVersions(APP_VERSION, latestTag) < 0) {
        setUpdateDialog({
          kind: "new",
          tag: release.tagName,
          url: `${APP_GITHUB_URL}/releases/tag/${release.tagName}`,
        });
      } else {
        setUpdateDialog({ kind: "latest", tag: APP_VERSION });
      }
    } catch (error) {
      console.error("Check update failed:", error);
      setUpdateDialog({ kind: "error" });
    }
  };

  const statRows = [
    { label: "Novels", value: stats.novels, icon: ICONS.library },
    { label: "Authors", value: stats.authors, icon: ICONS.author },
    { label: "Tags", value: stats.tags, icon: ICONS.tag },
    { label: "Contests", value: stats.contests, icon: ICONS.contest },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Database Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATABASE STATISTICS</Text>
          <View style={[styles.card, Platform.OS === "web" ? { flexDirection: "row", flexWrap: "wrap" } : null]}>
            {statRows.map((item, index) => (
              <View
                key={item.label}
                style={
                  Platform.OS === "web"
                    ? { width: "50%", paddingRight: (index + 1) % 2 !== 0 ? 16 : 0, paddingBottom: 16 }
                    : undefined
                }
              >
                {index > 0 && Platform.OS !== "web" && <View style={styles.statDivider} />}
                <View style={styles.statRow}>
                  <View style={styles.statLeft}>
                    <Ionicons name={item.icon} size={18} color={colors.primary} style={styles.statIcon} />
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.statValue}>{item.value.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} onPress={() => setThemeVisible(true)} activeOpacity={0.6}>
              <Ionicons name={ICONS.theme} size={22} color={colors.primary} style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Theme</Text>
                <Text style={styles.actionSubtitle}>
                  {THEME_OPTIONS.find((o) => o.key === mode)?.label ?? "跟随系统"}
                </Text>
              </View>
              <Ionicons name={ICONS.jump} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dangerous Area */}
        <View style={styles.section}>
          <Text style={styles.dangerSectionTitle}>DANGEROUS AREA</Text>
          <View style={[styles.dangerCard, Platform.OS === "web" ? { flexDirection: "row", flexWrap: "wrap" } : null]}>
            <TouchableOpacity
              style={[styles.actionRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={handleClearBookshelf}
              activeOpacity={0.6}
            >
              <Ionicons name={ICONS.trash} size={22} color={colors.danger} style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabelDanger}>Clear Bookshelf</Text>
                <Text style={styles.actionSubtitle}>Permanently remove all saved novels</Text>
              </View>
              <Ionicons name={ICONS.jump} size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.dangerDivider} />}

            <TouchableOpacity
              style={[styles.actionRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={handleResetData}
              activeOpacity={0.6}
            >
              <Ionicons name={ICONS.warning} size={22} color={colors.danger} style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabelDanger}>Reinit</Text>
                <Text style={styles.actionSubtitle}>Clear cache, bookshelf and reinitialize data</Text>
              </View>
              <Ionicons name={ICONS.jump} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {reinitState && <Text style={styles.reinitStatus}>{reinitState}</Text>}
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={[styles.card, Platform.OS === "web" ? { flexDirection: "row", flexWrap: "wrap" } : null]}>
            <TouchableOpacity
              style={[styles.aboutRow, Platform.OS === "web" ? { width: "100%", paddingBottom: 16 } : null]}
              onPress={() => router.push("/about")}
              activeOpacity={0.6}
            >
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutAppName}>{APP_NAME}</Text>
                <Text style={styles.aboutVersion}>v{APP_VERSION} · {APP_SLOGAN_EN}</Text>
              </View>
              <Ionicons name={ICONS.jump} size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aboutRow, Platform.OS === "web" ? { width: "100%", paddingBottom: 16 } : null]}
              onPress={handleCheckUpdate}
              activeOpacity={0.6}
            >
              <View style={styles.aboutInfo}>
                <Text style={[styles.aboutAppName, { color: colors.text }]}>检查更新</Text>
                <Text style={styles.aboutVersion}>从 GitHub Release 拉取最新版本</Text>
              </View>
              <Ionicons name={ICONS.download} size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => setWhyVisible(true)}
              activeOpacity={0.6}
            >
              <Ionicons name={ICONS.tip} size={22} color={colors.primary} style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Why Novly?</Text>
                <Text style={styles.actionSubtitle}>Why this project exists (SFACG data problems)</Text>
              </View>
              <Ionicons name={ICONS.jump} size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => Linking.openURL(`${APP_GITHUB_URL}/blob/main/CHANGELOG.md`)}
              activeOpacity={0.6}
            >
              <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Changelog</Text>
                <Text style={styles.actionSubtitle}>View version changes and bug fixes</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => handleOpenUrl(APP_NOVEL_HUB_URL)}
              activeOpacity={0.6}
            >
              <Ionicons name="git-branch-outline" size={22} color={colors.primary} style={styles.linkIcon} />
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>Data Source</Text>
                <Text style={styles.linkSubtitle}>{ghShortUrl(APP_NOVEL_HUB_URL)}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => handleOpenUrl(APP_NOVEL_HUB_MOBILE_URL)}
              activeOpacity={0.6}
            >
              <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} style={styles.linkIcon} />
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>Flutter Version</Text>
                <Text style={styles.linkSubtitle}>{ghShortUrl(APP_NOVEL_HUB_MOBILE_URL)}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => handleOpenUrl(APP_GITHUB_URL)}
              activeOpacity={0.6}
            >
              <Ionicons name="logo-github" size={22} color={colors.primary} style={styles.linkIcon} />
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>This Project</Text>
                <Text style={styles.linkSubtitle}>{ghShortUrl(APP_GITHUB_URL)}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => handleOpenUrl(APP_LICENSE_URL)}
              activeOpacity={0.6}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} style={styles.linkIcon} />
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>MIT License</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Copyright */}
        <View style={styles.copyright}>
          <Text textBreakStrategy="simple" style={styles.copyrightText}>
            © {new Date().getFullYear()} {APP_GITHUB_ORG}
          </Text>
        </View>
      </ScrollView>

      {/* Why Novly? 说明弹层(内容来自 assets/content/why.txt) */}
      <InfoSheet visible={whyVisible} onClose={() => setWhyVisible(false)} title={`为什么开发 ${APP_NAME}?`}>
        {whyBlocks.map((block, i) =>
          block.bullet ? (
            <InfoItem key={i}>{block.text}</InfoItem>
          ) : (
            <InfoBody key={i}>{block.text}</InfoBody>
          ),
        )}
      </InfoSheet>
      {/* Theme picker modal */}
      <Modal visible={themeVisible} transparent animationType="fade" onRequestClose={() => setThemeVisible(false)}>
        <Pressable style={styles.themeBackdrop} onPress={() => setThemeVisible(false)}>
          <Pressable style={[styles.themeSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.themeTitle, { color: colors.text }]}>选择主题</Text>
            {THEME_OPTIONS.map((opt, index) => {
              const selected = mode === opt.key;
              return (
                <View key={opt.key}>
                  {index > 0 && <View style={[styles.themeDivider, { backgroundColor: colors.surfaceBorder }]} />}
                  <TouchableOpacity
                    style={styles.themeRow}
                    onPress={() => {
                      setMode(opt.key);
                      setThemeVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={22}
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.themeLabel,
                        { color: selected ? colors.primary : colors.text },
                        selected && styles.themeLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                </View>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Dangerous action confirm */}
      <ConfirmDialog
        visible={confirmTarget !== null}
        title={confirmTarget === "reset" ? "重新初始化" : "清空书架"}
        message={
          confirmTarget === "reset"
            ? "将清除全部缓存与书架并重新初始化数据库，此操作不可恢复！"
            : "将从书架移除所有作品，此操作不可恢复！"
        }
        confirmText={confirmTarget === "reset" ? "确认重新初始化" : "确认清空"}
        danger
        onConfirm={() => {
          if (confirmTarget === "reset") {
            doResetData();
          } else {
            doClearBookshelf();
          }
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />

      {/* 版本更新检查对话框 */}
      <ConfirmDialog
        visible={updateDialog !== null}
        title={
          updateDialog?.kind === "new"
            ? `发现新版本 ${updateDialog.tag}`
            : updateDialog?.kind === "error"
              ? "检查更新失败"
              : "已是最新版本"
        }
        message={
          updateDialog?.kind === "new"
            ? `当前版本 v${APP_VERSION},最新版本 ${updateDialog.tag}。前往 GitHub Release 下载更新?`
            : updateDialog?.kind === "error"
              ? "无法连接 GitHub,请检查网络后重试"
              : `当前已是最新版本 v${APP_VERSION}`
        }
        confirmText={updateDialog?.kind === "new" ? "前往下载" : "好的"}
        onConfirm={() => {
          if (updateDialog?.kind === "new" && updateDialog.url) {
            Linking.openURL(updateDialog.url);
          }
          setUpdateDialog(null);
        }}
        onCancel={() => setUpdateDialog(null)}
      />
    </View>
  );
}

function createSettingsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor: colors.background,
    },
    content: {
      paddingBottom: Spacing.xl + Spacing.lg,
    },
    copyright: {
      alignSelf: "center",
      alignItems: "center",
      paddingVertical: Spacing.xl,
    },
    copyrightLink: {
      alignSelf: "stretch",
    },
    copyrightText: {
      fontWeight: "600",
      paddingHorizontal: 2,
      fontSize: FontSize.sm,
      color: colors.textTertiary,
      alignSelf: "stretch",
      textAlign: "center",
    },
    copyrightBrand: {
      marginTop: Spacing.sm,
    },
    section: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
    },
    sectionTitle: {
      fontSize: FontSize.xs,
      fontWeight: "600",
      color: colors.primary,
      letterSpacing: 1,
      marginBottom: Spacing.sm,
      paddingLeft: Spacing.xs,
    },
    dangerSectionTitle: {
      fontSize: FontSize.xs,
      fontWeight: "700",
      color: colors.danger,
      letterSpacing: 1,
      marginBottom: Spacing.sm,
      paddingLeft: Spacing.xs,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      overflow: "hidden",
    },
    dangerCard: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.danger + "55",
    },
    dangerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.danger + "33",
      marginLeft: Spacing.lg + 22 + Spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.surfaceBorder,
      marginLeft: Spacing.lg + 22 + Spacing.md,
    },
    statDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.surfaceBorder,
      marginLeft: Spacing.lg + 18 + Spacing.md,
    },
    // Stat rows
    statRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    statLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    statIcon: {
      marginRight: Spacing.md,
    },
    statLabel: {
      fontSize: FontSize.md,
      color: colors.text,
    },
    statValue: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    // Action rows
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    actionIcon: {
      marginRight: Spacing.md,
      width: 22,
      textAlign: "center",
    },
    actionInfo: {
      flex: 1,
    },
    actionLabel: {
      fontSize: FontSize.md,
      color: colors.text,
    },
    actionLabelDanger: {
      fontSize: FontSize.md,
      color: colors.danger,
    },
    actionSubtitle: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    reinitStatus: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      textAlign: "center",
    },
    // About section
    aboutRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    aboutInfo: {
      flex: 1,
    },
    aboutAppName: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    aboutVersion: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    linkIcon: {
      marginRight: Spacing.md,
      width: 22,
      textAlign: "center",
    },
    linkInfo: {
      flex: 1,
    },
    linkLabel: {
      fontSize: FontSize.md,
      color: colors.text,
    },
    linkSubtitle: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    // Theme picker
    themeBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      paddingHorizontal: Spacing.xl,
    },
    themeSheet: {
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.lg,
    },
    themeTitle: {
      fontSize: FontSize.lg,
      fontWeight: "700",
      marginBottom: Spacing.sm,
    },
    themeDivider: {
      height: StyleSheet.hairlineWidth,
    },
    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: Spacing.md,
      gap: Spacing.md,
    },
    themeLabel: {
      flex: 1,
      fontSize: FontSize.md,
    },
    themeLabelSelected: {
      fontWeight: "600",
    },
  });
}
