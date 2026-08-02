import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform, Modal, Pressable } from "react-native";
import { useState, useEffect, useMemo } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { getDatabase } from "../utils/database";
import { clearBookshelf } from "../utils/bookshelfDb";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { PageHeader } from "../components/Header";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useTheme, type ThemeColors, type ThemeMode } from "../components/ThemeProvider";

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: string }[] = [
  { key: "system", label: "跟随系统", icon: "phone-portrait-outline" },
  { key: "light", label: "浅色模式", icon: "sunny-outline" },
  { key: "dark", label: "深色模式", icon: "moon-outline" },
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
  const [confirmTarget, setConfirmTarget] = useState<"bookshelf" | "reset" | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

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
      Alert.alert("Done", "Cache cleared. Please restart the app to load default data.");
    } catch (error) {
      console.error("Failed to reset data:", error);
    }
  }

  function handleOpenUrl(url: string) {
    Linking.openURL(url);
  }

  const statRows = [
    { label: "Novels", value: stats.novels, icon: "library-outline" as const },
    { label: "Authors", value: stats.authors, icon: "person-outline" as const },
    { label: "Tags", value: stats.tags, icon: "pricetag-outline" as const },
    { label: "Contests", value: stats.contests, icon: "trophy-outline" as const },
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
              <Ionicons name="contrast-outline" size={22} color={colors.primary} style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Theme</Text>
                <Text style={styles.actionSubtitle}>
                  {THEME_OPTIONS.find((o) => o.key === mode)?.label ?? "跟随系统"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
              <Ionicons name="trash-outline" size={22} color={colors.danger} style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabelDanger}>Clear Bookshelf</Text>
                <Text style={styles.actionSubtitle}>Permanently remove all saved novels</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.dangerDivider} />}

            <TouchableOpacity
              style={[styles.actionRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={handleResetData}
              activeOpacity={0.6}
            >
              <Ionicons name="alert-circle-outline" size={22} color={colors.danger} style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabelDanger}>Reset Data</Text>
                <Text style={styles.actionSubtitle}>Clear cache, bookshelf and restore defaults</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
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
                <Text style={styles.aboutAppName}>Novly</Text>
                <Text style={styles.aboutVersion}>v1.0.2 · Offline-first browser for novel metadata</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => router.push("/changelog")}
              activeOpacity={0.6}
            >
              <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.actionIcon} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Changelog</Text>
                <Text style={styles.actionSubtitle}>View version changes and bug fixes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => handleOpenUrl("https://github.com/light-nook-labs/novel_hub")}
              activeOpacity={0.6}
            >
              <Ionicons name="git-branch-outline" size={22} color={colors.primary} style={styles.linkIcon} />
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>Data Source</Text>
                <Text style={styles.linkSubtitle}>light-nook-labs/novel_hub</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => handleOpenUrl("https://github.com/light-nook-labs/NovelHubMobile")}
              activeOpacity={0.6}
            >
              <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} style={styles.linkIcon} />
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>Flutter Version</Text>
                <Text style={styles.linkSubtitle}>light-nook-labs/NovelHubMobile</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => handleOpenUrl("https://github.com/light-nook-labs/novly")}
              activeOpacity={0.6}
            >
              <Ionicons name="logo-github" size={22} color={colors.primary} style={styles.linkIcon} />
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>This Project</Text>
                <Text style={styles.linkSubtitle}>light-nook-labs/novly</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {Platform.OS !== "web" && <View style={styles.divider} />}

            <TouchableOpacity
              style={[styles.linkRow, Platform.OS === "web" ? { width: "50%", paddingRight: 16 } : null]}
              onPress={() => handleOpenUrl("https://github.com/light-nook-labs/novly/blob/master/LICENSE")}
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
            © {new Date().getFullYear()} light-nook-labs
          </Text>
        </View>
      </ScrollView>

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
        title={confirmTarget === "reset" ? "重置数据" : "清空书架"}
        message={
          confirmTarget === "reset"
            ? "将清除全部缓存与书架并恢复默认数据库，此操作不可恢复！"
            : "将从书架移除所有作品，此操作不可恢复！"
        }
        confirmText={confirmTarget === "reset" ? "确认重置" : "确认清空"}
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
