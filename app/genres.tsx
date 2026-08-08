import { GenreCount, CacheEntry } from "../types/models";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../utils/database";
import { genreMapping } from "../utils/mappings";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";
import { Loading } from "../components/Loading";

const CACHE_KEY = "genres_cache_v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

export default function GenresScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const [genres, setGenres] = useState<GenreCount[]>([]);
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
          backgroundColor: colors.background,
        },
        list: {
          padding: Spacing.lg,
        },
        genreItem: {
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
          backgroundColor: colors.primary + "15",
          justifyContent: "center",
          alignItems: "center",
        },
        genreInfo: {
          flex: 1,
        },
        genreName: {
          fontSize: FontSize.md,
          fontWeight: "600",
          color: colors.text,
        },
        genreCount: {
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
    // eslint-disable-next-line react-hooks/immutability -- React Compiler 规则标记既有加载模式,数据更新为有意为之
    loadGenres();
  }, []);

  async function loadGenres() {
    try {
      // 1. Try cache first for instant first screen
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const entry: CacheEntry<GenreCount[]> = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          setGenres(entry.data);
          setLoading(false);
          return;
        }
      }

      // 2. Load all genres from DB (data is small)
      const db = await getDatabase();
      const results = await db.getAllAsync<GenreCount>(
        "SELECT genre, COUNT(*) as count FROM novels GROUP BY genre ORDER BY count DESC",
      );
      setGenres(results);

      // 3. Write cache
      const entry: CacheEntry<GenreCount[]> = { timestamp: Date.now(), data: results };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
      console.error("Failed to load genres:", error);
    } finally {
      setLoading(false);
    }
  }

  const total = genres.reduce((sum, g) => sum + g.count, 0);

  return (
    <View style={styles.container}>
      <PageHeader title="Genres" titleAppend={genres.length > 0 ? String(genres.length) : undefined} />

      {loading && genres.length === 0 ? (
        <Loading />
      ) : (
        <FlatList
          numColumns={numColumns}
          key={`grid-${numColumns}`}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          data={genres}
          keyExtractor={(item) => item.genre.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>未找到匹配的分类</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.genreItem,
                {
                  width:
                    numColumns > 1
                      ? `${(100 - ((numColumns - 1) * 16 * 100) / (winWidth || 1)) / numColumns}%`
                      : "100%",
                },
              ]}
              activeOpacity={0.7}
              onPress={() => router.push(`/genres/${item.genre}`)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="layers-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.genreInfo}>
                <Text style={styles.genreName} numberOfLines={1}>
                  {genreMapping[item.genre]}
                </Text>
                <Text style={styles.genreCount}>
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
