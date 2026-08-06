import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { StatusCount, CacheEntry } from "../types/models";
import { getDatabase } from "../utils/database";
import { statusMapping } from "../utils/mappings";
import { statusColor } from "../components/Badge";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";
import { Loading } from "../components/Loading";
import { NoteCard, NoteStrong } from "../components/NoteCard";

const CACHE_KEY = "statuses_cache_v3";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

export default function StatusesScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const [statuses, setStatuses] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        gridRow: {
          gap: 16,
          marginBottom: 16,
        },
        container: {
          flex: 1,
          ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

          backgroundColor: colors.background,
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
    [colors],
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
          setStatuses(entry.data);
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
         ORDER BY count DESC`,
      );
      setStatuses(results);

      // 3. Write cache
      const entry: CacheEntry = { timestamp: Date.now(), data: results };
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
      <PageHeader title="Statuses" titleAppend={statuses.length > 0 ? String(statuses.length) : undefined} />

      {/* A 标记说明 */}
      <NoteCard>
        在小说列表等页面可能会看到 <NoteStrong>完结A</NoteStrong> / <NoteStrong>断更A</NoteStrong> 状态。带{" "}
        <NoteStrong>A</NoteStrong>（Active）表示完结或断更但数据表现突出（如
        banner、点赞、点击等）的作品，很可能是读者想找的书
      </NoteCard>

      {loading && statuses.length === 0 ? (
        <Loading />
      ) : (
        <FlatList
          numColumns={numColumns}
          key={`grid-${numColumns}`}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
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
              style={[
                styles.statusItem,
                {
                  width:
                    numColumns > 1
                      ? `${(100 - ((numColumns - 1) * 16 * 100) / (winWidth || 1)) / numColumns}%`
                      : "100%",
                },
              ]}
              activeOpacity={0.7}
              onPress={() => router.push(`/statuses/${item.status}`)}
            >
              <View style={styles.iconWrap}>
                <View style={[styles.dot, { backgroundColor: statusColor(colors, item.status) }]} />
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
