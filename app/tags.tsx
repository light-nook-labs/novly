import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Link } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Tag, CacheEntry } from "../types/models";
import { getDatabase } from "../utils/database";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";
import { Loading, LoadingFooter } from "../components/Loading";

const CACHE_KEY = "tags_cache_v2";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

export default function TagsScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 宽屏按宽度递增列数(标签块较窄,最多 6 列);手机保持 3 列
  const numColumns =
    Platform.OS === "web"
      ? winWidth >= 2400
        ? 6
        : winWidth >= 2000
          ? 5
          : winWidth >= 1600
            ? 4
            : winWidth >= 1200
              ? 3
              : winWidth >= 800
                ? 2
                : 1
      : 3;
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
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
          padding: Spacing.md,
        },
        row: {
          gap: Spacing.sm,
          marginBottom: Spacing.sm,
        },
        tagItem: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 4,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: BorderRadius.md,
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
    [colors],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- React Compiler 规则标记既有加载模式,数据更新为有意为之
    loadTags();
  }, []);

  async function loadTags() {
    try {
      // 1. Try cache first for instant first screen
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const entry: CacheEntry<Tag[]> = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          setTags(entry.data);
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
         ORDER BY novel_count DESC, t.name ASC`,
      );
      setTags(results);

      // 3. Write cache
      const entry: CacheEntry<Tag[]> = { timestamp: Date.now(), data: results };
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
    return tags.filter((t) => t.name.toLowerCase().includes(kw));
  }, [tags, query]);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tags"
        titleAppend={tags.length > 0 ? String(tags.length) : undefined}
        search={query}
        setSearch={setQuery}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={loading && tags.length > 0 ? <LoadingFooter /> : null}
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>未找到匹配的标签</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Link href={`/tags/${item.id}`} asChild>
            <TouchableOpacity
              style={StyleSheet.flatten([
                styles.tagItem,
                {
                  width:
                    numColumns > 1
                      ? `${(100 - ((numColumns - 1) * 16 * 100) / (winWidth || 1)) / numColumns}%`
                      : "100%",
                },
              ])}
              activeOpacity={0.7}
            >
              <Text style={styles.tagName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.tagCount}>{item.novel_count}</Text>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
}
