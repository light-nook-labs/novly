import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../utils/database";
import { genreMapping } from "../utils/mappings";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";

interface GenreCount {
  genre: number;
  count: number;
}

const CACHE_KEY = "genres_cache_v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CacheEntry {
  timestamp: number;
  genres: GenreCount[];
}

export default function GenresScreen() {
  const { colors } = useTheme();
  const [genres, setGenres] = useState<GenreCount[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
    [colors]
  );

  useEffect(() => {
    loadGenres();
  }, []);

  async function loadGenres() {
    try {
      // 1. Try cache first for instant first screen
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          setGenres(entry.genres);
          setLoading(false);
          return;
        }
      }

      // 2. Load all genres from DB (data is small)
      const db = await getDatabase();
      const results = await db.getAllAsync<GenreCount>(
        "SELECT genre, COUNT(*) as count FROM novels GROUP BY genre ORDER BY count DESC"
      );
      setGenres(results);

      // 3. Write cache
      const entry: CacheEntry = { timestamp: Date.now(), genres: results };
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
      <PageHeader
        title="Genres"
        titleAppend={genres.length > 0 ? String(genres.length) : undefined}
      />

      {loading && genres.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载分类中...</Text>
        </View>
      ) : (
        <FlatList
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
              style={styles.genreItem}
              activeOpacity={0.7}
              onPress={() => router.push(`/genre/${item.genre}`)}
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
