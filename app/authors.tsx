import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { getDatabase } from "../utils/database";
import { formatNumber } from "../utils/mappings";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { FontSize, Spacing } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";
import { Ionicons } from "@expo/vector-icons";

interface Author {
  id: number;
  name: string;
  top_novel_title: string | null;
  top_novel_clicks: number;
}

export default function AuthorsScreen() {
  const { colors } = useTheme();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();
  const [listHeight, setListHeight] = useState(0);

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
        authorItem: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          backgroundColor: colors.surface,
          marginHorizontal: Spacing.lg,
          marginBottom: 1,
          gap: Spacing.md,
        },
        authorInfo: {
          flex: 1,
        },
        authorName: {
          fontSize: FontSize.md,
          fontWeight: "600",
          color: colors.text,
        },
        topNovel: {
          fontSize: FontSize.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        clicks: {
          fontSize: FontSize.sm,
          color: colors.textTertiary,
        },
        emptyState: {
          alignItems: "center",
          paddingVertical: Spacing.xl,
        },
        emptyText: {
          fontSize: FontSize.md,
          color: colors.textTertiary,
        },
        footer: {
          paddingVertical: Spacing.xl,
          alignItems: "center",
        },
        footerText: {
          fontSize: FontSize.sm,
          color: colors.textTertiary,
        },
        backToTop: {
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          elevation: 4,
        },
      }),
    [colors]
  );

  useEffect(() => {
    loadCount();
    loadAuthors(true);
  }, []);

  async function loadCount() {
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ v: number }>("SELECT COUNT(*) as v FROM authors");
      setTotalCount(result?.v ?? 0);
    } catch (error) {
      console.error("Failed to load author count:", error);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAuthors(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function loadAuthors(reset = false) {
    try {
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;

      let sql = "SELECT id, name, top_novel_title, top_novel_clicks FROM authors";
      const params: any[] = [];

      if (query) {
        sql += " WHERE name LIKE ? OR top_novel_title LIKE ?";
        params.push(`%${query}%`, `%${query}%`);
      }

      sql += " ORDER BY top_novel_clicks DESC LIMIT ? OFFSET ?";
      params.push(PAGE_SIZE, offset);

      const results = await db.getAllAsync<Author>(sql, params);

      if (reset) {
        setAuthors(results);
        setPage(1);
      } else {
        setAuthors((prev) => {
          const existingIds = new Set(prev.map(a => a.id));
          const newItems = results.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
        setPage((prev) => prev + 1);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load authors:", error);
    }
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Authors"
        titleAppend={totalCount > 0 ? formatNumber(totalCount) : undefined}
        search={query}
        setSearch={setQuery}
      />

      <FlatList
        ref={scrollRef}
        data={authors}
        keyExtractor={(item) => item.id.toString()}
        onScroll={onScroll}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          if (h <= listHeight && hasMore && authors.length >= PAGE_SIZE) {
            loadAuthors(false);
          }
        }}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.authorItem}
            onPress={() => router.push(`/author/${item.id}`)}
          >
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{item.name}</Text>
              {item.top_novel_title && (
                <Text style={styles.topNovel} numberOfLines={1}>
                  Top: {item.top_novel_title}
                </Text>
              )}
            </View>
            <Text style={styles.clicks}>{formatNumber(item.top_novel_clicks)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          authors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>暂无作者数据</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>加载中...</Text>
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasMore) loadAuthors(false);
        }}
        onEndReachedThreshold={0.5}
      />

      {showButton && (
        <TouchableOpacity style={styles.backToTop} onPress={scrollToTop}>
          <Ionicons name="arrow-up" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
