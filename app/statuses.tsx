import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../utils/database";
import { statusMapping, statusColors } from "../utils/mappings";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";

interface StatusCount {
  status: number;
  count: number;
}

const CACHE_KEY = "statuses_cache_v2";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CacheEntry {
  timestamp: number;
  statuses: StatusCount[];
}

export default function StatusesScreen() {
  const { colors } = useTheme();
  const [statuses, setStatuses] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        noteCard: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: Spacing.sm,
          backgroundColor: colors.primary + "0D",
          marginHorizontal: Spacing.lg,
          marginTop: Spacing.sm,
          padding: Spacing.md,
          borderRadius: BorderRadius.md,
        },
        noteText: {
          flex: 1,
          fontSize: FontSize.sm,
          lineHeight: 20,
          color: colors.textSecondary,
        },
        noteStrong: {
          fontWeight: "700",
          color: colors.primary,
        },
        list: {
          padding: Spacing.lg,
        },
        statusItem: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          backgroundColor: colors.surface,
          marginBottom: Spacing.sm,
          borderRadius: BorderRadius.md,
          gap: Spacing.md,
        },
        iconWrap: {
          width: 32,
          height: 32,
          borderRadius: BorderRadius.sm,
          backgroundColor: colors.surfaceBorder,
          justifyContent: "center",
          alignItems: "center",
        },
        dot: {
          width: 14,
          height: 14,
          borderRadius: 7,
        },
        statusInfo: {
          flex: 1,
        },
        statusName: {
          fontSize: FontSize.md,
          fontWeight: "600",
          color: colors.text,
        },
        statusCount: {
          fontSize: FontSize.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        loading: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: Spacing.md,
        },
        loadingText: {
          fontSize: FontSize.md,
          color: colors.textTertiary,
        },
        empty: {
          alignItems: "center",
          paddingVertical: Spacing.xl * 2,
          gap: Spacing.md,
        },
        emptyText: {
          fontSize: FontSize.md,
          color: colors.textTertiary,
        },
      }),
    [colors]
  );

  useEffect(() => {
    loadStatuses();
  }, []);

  async function loadStatuses() {
    try {
      // 1. Try cache first for instant first screen
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          setStatuses(entry.statuses);
          setLoading(false);
          return;
        }
      }

      // 2. Load all statuses from DB (data is small)
      const db = await getDatabase();
      const results = await db.getAllAsync<StatusCount>(
        `SELECT CASE
                  WHEN status = 5 THEN 4
                  WHEN status = 6 THEN 2
                  ELSE status
                END as status,
                COUNT(*) as count
         FROM novels
         WHERE status IN (2, 3, 4, 5, 6)
         GROUP BY CASE
                  WHEN status = 5 THEN 4
                  WHEN status = 6 THEN 2
                  ELSE status
                END
         ORDER BY count DESC`
      );
      setStatuses(results);

      // 3. Write cache
      const entry: CacheEntry = { timestamp: Date.now(), statuses: results };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
      console.error("Failed to load statuses:", error);
    } finally {
      setLoading(false);
    }
  }

  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Statuses"
        titleAppend={statuses.length > 0 ? String(statuses.length) : undefined}
      />

      {/* A 标记说明 */}
      <View style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.noteText}>
          在小说列表等页面可能会看到 <Text style={styles.noteStrong}>完结A</Text> / <Text style={styles.noteStrong}>断更A</Text> 状态。带 <Text style={styles.noteStrong}>A</Text>（Active）表示完结或断更但数据表现突出（如 banner、点赞、点击等）的作品，很可能是读者想找的书
        </Text>
      </View>

      {loading && statuses.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载状态中...</Text>
        </View>
      ) : (
        <FlatList
          data={statuses}
          keyExtractor={(item) => item.status.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pulse-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>未找到匹配的状态</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.statusItem}
              activeOpacity={0.7}
              onPress={() => router.push(`/status/${item.status}`)}
            >
              <View style={styles.iconWrap}>
                <View style={[styles.dot, { backgroundColor: statusColors[item.status] || "#999" }]} />
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusName} numberOfLines={1}>
                  {statusMapping[item.status]}
                </Text>
                <Text style={styles.statusCount}>
                  {item.count} 部作品 · {total > 0 ? Math.round((item.count / total) * 100) : 0}%
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
