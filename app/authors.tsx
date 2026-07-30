import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Link, router } from "expo-router";
import { useState, useEffect } from "react";
import { getDatabase } from "../lib/data/database";
import { formatNumber } from "../utils/mappings";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { Colors, FontSize, Spacing, BorderRadius } from "../constants/theme";
import { PageHeader } from "../components/Header";
import { Ionicons } from "@expo/vector-icons";

interface Author {
  id: number;
  name: string;
  top_novel_title: string | null;
  top_novel_clicks: number;
}

export default function AuthorsScreen() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  useEffect(() => {
    loadAuthors(true);
  }, []);

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
        search={query}
        setSearch={setQuery}
      />

      <FlatList
        ref={scrollRef}
        data={authors}
        keyExtractor={(item) => item.id.toString()}
        onScroll={onScroll}
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
          <Ionicons name="arrow-up" size={20} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: Spacing.lg,
  },
  authorItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
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
    color: Colors.text,
  },
  topNovel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  clicks: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  backToTop: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
});
