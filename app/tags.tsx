import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../utils/database";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";

interface Tag {
  id: number;
  name: string;
  novel_count: number;
}

const CACHE_KEY = "tags_cache_v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CacheEntry {
  timestamp: number;
  tags: Tag[];
}

export default function TagsScreen() {
  const { colors } = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        list: {
          padding: Spacing.md,
        },
        row: {
          gap: Spacing.sm,
          marginBottom: Spacing.sm,
        },
        tagItem: {
          flex: 1,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: BorderRadius.md,
          alignItems: "center",
          gap: 2,
        },
        tagName: {
          fontSize: FontSize.sm,
          fontWeight: "600",
          color: colors.text,
          textAlign: "center",
        },
        tagCount: {
          fontSize: FontSize.xs,
          color: colors.textTertiary,
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
    loadTags();
  }, []);

  async function loadTags() {
    try {
      // 1. Try cache first for instant first screen
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          setTags(entry.tags);
          setLoading(false);
          return;
        }
      }

      // 2. Load all tags from DB (data is small)
      const db = await getDatabase();
      const results = await db.getAllAsync<Tag>(
        `SELECT t.id, t.name, COUNT(nt.novel_id) as novel_count
         FROM tags t
         LEFT JOIN novel_tags nt ON t.id = nt.tag_id
         GROUP BY t.id
         ORDER BY novel_count DESC, t.name ASC`
      );
      setTags(results);

      // 3. Write cache
      const entry: CacheEntry = { timestamp: Date.now(), tags: results };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
      console.error("Failed to load tags:", error);
    } finally {
      setLoading(false);
    }
  }

  // In-memory filtering for instant search
  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return tags;
    return tags.filter(
      (t) => t.name.toLowerCase().includes(kw)
    );
  }, [tags, query]);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tags"
        titleAppend={tags.length > 0 ? String(tags.length) : undefined}
        search={query}
        setSearch={setQuery}
      />

      {loading && tags.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载标签中...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>未找到匹配的标签</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Link href={`/tag/${item.id}`} asChild>
              <TouchableOpacity style={styles.tagItem} activeOpacity={0.7}>
                <Text style={styles.tagName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.tagCount}>{item.novel_count}</Text>
              </TouchableOpacity>
            </Link>
          )}
        />
      )}
    </View>
  );
}
