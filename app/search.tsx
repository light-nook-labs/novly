import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Link } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../utils/database";
import { formatNumber } from "../utils/mappings";
import { PageHeader } from "../components/Header";
import { LoadingFooter } from "../components/Loading";
import { useTheme } from "../components/ThemeProvider";
import { Colors, FontSize, Spacing, BorderRadius } from "../constants/theme";

interface Novel {
  id: number;
  title: string;
  author: string | null;
  click_num: number | null;
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns = Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Novel[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const [listHeight, setListHeight] = useState(0);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (searchQuery: string, reset = false) => {
      const trimmed = searchQuery.trim();

      if (!trimmed) {
        setResults([]);
        setPage(0);
        setHasMore(true);
        return;
      }

      try {
        setLoading(true);
        const db = await getDatabase();
        const offset = reset ? 0 : page * PAGE_SIZE;
        const numericId = Number.parseInt(trimmed, 10);
        const idQuery = Number.isNaN(numericId) ? -1 : numericId;

        const results = await db.getAllAsync<Novel>(
          `SELECT id, title, author, click_num
         FROM novels
         WHERE title LIKE ?
            OR author LIKE ?
            OR id = ?
         ORDER BY click_num DESC
         LIMIT ? OFFSET ?`,
          [`%${trimmed}%`, `%${trimmed}%`, idQuery, PAGE_SIZE, offset],
        );

        if (reset) {
          setResults(results);
          setPage(1);
        } else {
          setResults((prev) => [...prev, ...results]);
          setPage((prev) => prev + 1);
        }

        setHasMore(results.length === PAGE_SIZE);
      } catch (error) {
        console.error("Search failed:", error);
      }
    },
    [page],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Search" />
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.surfaceBorder }]}>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.surfaceBorder, borderColor: colors.surfaceBorder },
          ]}
          placeholder="搜索标题、作者或小说 ID..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? { gap: 16, marginBottom: 16 } : undefined}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          if (h <= listHeight && hasMore) {
            search(query, false);
          }
        }}
        renderItem={({ item }) => (
          <Link href={`/novels/${item.id}`} asChild>
            <TouchableOpacity
              style={StyleSheet.flatten([styles.resultItem, { borderBottomColor: colors.surfaceBorder }])}
            >
              <View style={styles.resultInfo}>
                <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title} #{item.id}
                </Text>
                <Text style={[styles.resultAuthor, { color: colors.textSecondary }]}>{item.author}</Text>
              </View>
              <Text style={StyleSheet.flatten([styles.resultClicks, { color: colors.textTertiary }])}>
                {formatNumber(item.click_num)}
              </Text>
            </TouchableOpacity>
          </Link>
        )}
        onEndReached={() => {
          if (hasMore) search(query, false);
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && results.length > 0 ? <LoadingFooter /> : null}
        ListEmptyComponent={
          query ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>未找到匹配结果</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>输入关键词搜索小说</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  resultItem: {
    flex: 1, // web 多列 grid 时均分列宽
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 20,
  },
  resultAuthor: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  resultClicks: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    paddingHorizontal: 2,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    alignSelf: "stretch",
    textAlign: "center",
  },
});
