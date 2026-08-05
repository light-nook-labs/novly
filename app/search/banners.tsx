import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { BannerListItem, type BannerNovel } from "../../components/BannerListItem";
import { PageHeader } from "../../components/Header";
import { LoadingFooter } from "../../components/Loading";
import { FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { useTheme, type ThemeColors } from "../../components/ThemeProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_SIZE = 10;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    gridRow: {
      gap: 16,
      marginBottom: 16,
    },
    container: {
      flex: 1,
      ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

      backgroundColor: colors.background,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.surfaceBorder,
      gap: Spacing.sm,
    },
    input: {
      flex: 1,
      height: 40,
      fontSize: FontSize.md,
      color: colors.text,
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.surfaceBorder,
      borderRadius: BorderRadius.sm,
    },
    searchBtn: {
      flexDirection: "row",
      alignItems: "center",
      height: 40,
      paddingHorizontal: Spacing.lg,
      backgroundColor: colors.primary,
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
      gap: Spacing.xl,
    },
    empty: {
      alignItems: "center",
      paddingTop: 80,
      gap: Spacing.md,
    },
    emptyText: {
      fontSize: FontSize.md,
      color: colors.textTertiary,
      alignSelf: "stretch",
      textAlign: "center",
    },
    footer: {
      paddingVertical: Spacing.xl,
      alignItems: "center",
    },
  });
}

export default function BannerSearchScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const numColumns = Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        [`%${trimmed}%`, `%${trimmed}%`, PAGE_SIZE, offset],
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
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        data={results}
        keyExtractor={(item) => item.id.toString()}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          if (h <= listHeight && hasMore && !loading) {
            handleLoadMore();
          }
        }}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View
            style={{
              width: `${100 / numColumns}%`,
              paddingRight: (index + 1) % numColumns !== 0 ? 16 : 0,
              paddingBottom: 16,
            }}
          >
            <BannerListItem id={item.id} title={item.title} author={item.author} />
          </View>
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
        ListFooterComponent={loading ? <LoadingFooter /> : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
