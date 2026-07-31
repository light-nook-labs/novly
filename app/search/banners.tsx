import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { BannerListItem, type BannerNovel } from "../../components/BannerListItem";
import { PageHeader } from "../../components/Header";
import { Colors, FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_SIZE = 10;

export default function BannerSearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BannerNovel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [listHeight, setListHeight] = useState(0);

  async function doSearch(reset = false) {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);

    try {
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;

      const rows = await db.getAllAsync<BannerNovel>(
        `SELECT id, title, author
         FROM novels
         WHERE has_banner = 1
           AND (title LIKE ? OR author LIKE ?)
         ORDER BY click_num DESC
         LIMIT ? OFFSET ?`,
        [`%${trimmed}%`, `%${trimmed}%`, PAGE_SIZE, offset]
      );

      if (reset) {
        setResults(rows);
        setPage(1);
      } else {
        setResults((prev) => [...prev, ...rows]);
        setPage((prev) => prev + 1);
      }

      setHasMore(rows.length === PAGE_SIZE);
    } catch (error) {
      console.error("Banner search failed:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = () => {
    doSearch(true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      doSearch(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Banner Search" />
      {/* Search bar with button */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="搜索背投标题或作者..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[styles.searchBtn, !query.trim() && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={!query.trim()}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={18} color="#fff" />
          <Text style={styles.searchBtnText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          if (h <= listHeight && hasMore && !loading) {
            handleLoadMore();
          }
        }}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <BannerListItem
            id={item.id}
            title={item.title}
            author={item.author}
            width={SCREEN_WIDTH - Spacing.lg * 2}
          />
        )}
        ListEmptyComponent={
          searched && !loading ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>未找到匹配的背投</Text>
            </View>
          ) : !searched ? (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>输入关键词搜索背投</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: BorderRadius.sm,
  },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  searchBtnText: {
    fontSize: FontSize.md,
    color: "#fff",
    fontWeight: "600",
  },
  list: {
    padding: Spacing.lg,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
});
