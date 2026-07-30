import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { getDatabase } from "../lib/data/database";
import { Colors, FontSize, Spacing, BorderRadius } from "../constants/theme";
import { PageHeader } from "../components/Header";

const STORAGE_KEY = "bookshelf";

export default function SettingsScreen() {
  const [stats, setStats] = useState({
    novels: 0,
    authors: 0,
    tags: 0,
    contests: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const db = await getDatabase();

      const novels = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM novels"
      );
      const authors = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM authors"
      );
      const tags = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM tags"
      );
      const contests = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM contests"
      );

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
    Alert.alert("Clear Bookshelf", "Remove all novels from your bookshelf?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            Alert.alert("Done", "Bookshelf has been cleared.");
          } catch (error) {
            console.error("Failed to clear bookshelf:", error);
          }
        },
      },
    ]);
  }

  function handleResetData() {
    Alert.alert(
      "Reset Data",
      "This will clear all local cache (bookshelf, etc.). Restart the app to reload the default database from built-in assets. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert(
                "Done",
                "Cache cleared. Please restart the app to load default data."
              );
            } catch (error) {
              console.error("Failed to reset data:", error);
            }
          },
        },
      ]
    );
  }

  function handleOpenUrl(url: string) {
    Linking.openURL(url);
  }

  const statRows = [
    { label: "Novels", value: stats.novels, icon: "book" as const },
    { label: "Authors", value: stats.authors, icon: "people" as const },
    { label: "Tags", value: stats.tags, icon: "pricetags" as const },
    { label: "Contests", value: stats.contests, icon: "trophy" as const },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
      {/* Database Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATABASE STATISTICS</Text>
        <View style={styles.card}>
          {statRows.map((item, index) => (
            <View key={item.label}>
              {index > 0 && <View style={styles.statDivider} />}
              <View style={styles.statRow}>
                <View style={styles.statLeft}>
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={Colors.primary}
                    style={styles.statIcon}
                  />
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
                <Text style={styles.statValue}>
                  {item.value.toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearBookshelf}
            activeOpacity={0.6}
          >
            <Ionicons
              name="bookmark-outline"
              size={22}
              color={Colors.danger}
              style={styles.actionIcon}
            />
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabelDanger}>Clear Bookshelf</Text>
              <Text style={styles.actionSubtitle}>
                Remove all saved novels
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleResetData}
            activeOpacity={0.6}
          >
            <Ionicons
              name="refresh-outline"
              size={22}
              color={Colors.danger}
              style={styles.actionIcon}
            />
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabelDanger}>Reset Data</Text>
              <Text style={styles.actionSubtitle}>
                Clear cache and restore defaults
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <View style={styles.aboutInfo}>
              <Text style={styles.aboutAppName}>Novly</Text>
              <Text style={styles.aboutVersion}>
                v1.0.0 · Offline-first browser for novel metadata
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() =>
              handleOpenUrl(
                "https://github.com/light-nook-labs/NovelHubMobile"
              )
            }
            activeOpacity={0.6}
          >
            <Ionicons
              name="logo-github"
              size={22}
              color={Colors.primary}
              style={styles.linkIcon}
            />
            <View style={styles.linkInfo}>
              <Text style={styles.linkLabel}>GitHub</Text>
              <Text style={styles.linkSubtitle}>
                light-nook-labs/NovelHubMobile
              </Text>
            </View>
            <Ionicons
              name="open-outline"
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() =>
              handleOpenUrl("https://github.com/light-nook-labs/novel_hub")
            }
            activeOpacity={0.6}
          >
            <Ionicons
              name="server-outline"
              size={22}
              color={Colors.primary}
              style={styles.linkIcon}
            />
            <View style={styles.linkInfo}>
              <Text style={styles.linkLabel}>Data Source</Text>
              <Text style={styles.linkSubtitle}>
                light-nook-labs/novel_hub
              </Text>
            </View>
            <Ionicons
              name="open-outline"
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.aboutRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={Colors.textTertiary}
              style={styles.linkIcon}
            />
            <View style={styles.aboutInfo}>
              <Text style={styles.linkLabel}>MIT License</Text>
              <Text style={styles.linkSubtitle}>
                React Native + Expo · Free Software
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing.xl + Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.surfaceBorder,
    marginLeft: Spacing.lg + 22 + Spacing.md,
  },
  statDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.surfaceBorder,
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
    color: Colors.text,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
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
  actionLabelDanger: {
    fontSize: FontSize.md,
    color: Colors.danger,
  },
  actionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
    color: Colors.text,
  },
  aboutVersion: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
    color: Colors.text,
  },
  linkSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
