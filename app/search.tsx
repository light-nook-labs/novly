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
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../utils/database";
import { type SearchNovel } from "../types/models";
import { formatNumber } from "../utils/mappings";
import { PageHeader } from "../components/Header";
import { LoadingFooter } from "../components/Loading";
import { useTheme } from "../components/ThemeProvider";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { PAGE_SIZE } from "../constants/pagination";

export default function SearchScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchNovel[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [listHeight, setListHeight] = useState(0);
  const [loading, setLoading] = useState(false);
  // 分页加载同步锁:防 onEndReached/onContentSizeChange 并发触发 search 导致同页重复追加(重复 key)
  const loadingRef = useRef(false);

  const search = useCallback(
    async (searchQuery: string, reset = false) => {
      const trimmed = searchQuery.trim();

      if (!trimmed) {
        setResults([]);
        setPage(0);
        setHasMore(true);
        return;
      }

      // 分页加载同步锁:防并发重复追加
      if (!reset && loadingRef.current) return;
      if (!reset) loadingRef.current = true;

      try {
        setLoading(true);
        const db = await getDatabase();
        const offset = reset ? 0 : page * PAGE_SIZE;
        const numericId = Number.parseInt(trimmed, 10);
        const idQuery = Number.isNaN(numericId) ? -1 : numericId;

        const results = await db.getAllAsync<SearchNovel>(
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
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [page],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query, true);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的输入防抖)
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Search" />
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.surfaceBorder, borderColor: colors.border },
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
              style={StyleSheet.flatten([
                styles.resultItem,
                { borderBottomColor: colors.border },
                {
                  width:
                    numColumns > 1
                      ? `${(100 - ((numColumns - 1) * 16 * 100) / (winWidth || 1)) / numColumns}%`
                      : "100%",
                },
              ])}
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
  },
  searchBar: {
    flexDirection: "row",
    padding: Spacing.sm,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
  },
  resultItem: {
    // web 多列 grid 时均分列宽
    flexDirection: "row",
    padding: Spacing.md,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: FontSize.md,
    fontWeight: "bold",
    lineHeight: 20,
  },
  resultAuthor: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  resultClicks: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    paddingHorizontal: 2,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    alignSelf: "stretch",
    textAlign: "center",
  },
});
