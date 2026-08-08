import { Author } from "../types/models";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { getDatabase } from "../utils/database";
import { formatNumber } from "../utils/mappings";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { FontSize, Spacing } from "../constants/theme";
import { PAGE_SIZE } from "../constants/pagination";
import { useTheme } from "../components/ThemeProvider";
import { BackToTop } from "../components/BackToTop";
import { NoteCard, NoteStrong } from "../components/NoteCard";
import { LoadingFooter } from "../components/Loading";
import { PageHeader } from "../components/Header";
import { Ionicons } from "@expo/vector-icons";

export default function AuthorsScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const [authors, setAuthors] = useState<Author[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();
  const [listHeight, setListHeight] = useState(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        gridRow: {
          paddingHorizontal: Spacing.lg,
          gap: 16,
          marginBottom: 16,
        },
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        list: {
          paddingVertical: Spacing.sm,
        },
        tipWrap: {
          marginBottom: Spacing.md,
        },
        authorItem: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          backgroundColor: colors.surface,
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
          fontWeight: "600",
          color: colors.textSecondary,
          marginTop: 2,
          paddingHorizontal: 2,
        },
        clicksWrap: {
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
        },
        clicks: {
          fontSize: FontSize.sm,
          fontWeight: "600",
          color: colors.textTertiary,
          paddingHorizontal: 2,
        },
        emptyState: {
          alignItems: "center",
          paddingVertical: Spacing.xl,
        },
        emptyText: {
          fontSize: FontSize.md,
          fontWeight: "600",
          color: colors.textTertiary,
          alignSelf: "stretch",
          textAlign: "center",
        },
        footer: {
          paddingVertical: Spacing.xl,
          alignItems: "center",
        },
        footerText: {
          fontSize: FontSize.sm,
          fontWeight: "600",
          color: colors.textTertiary,
          paddingHorizontal: 2,
        },
      }),
    [colors],
  );

  useEffect(() => {
    loadCount();
    loadAuthors(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的挂载执行)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的输入防抖)
  }, [query]);

  const loadingRef = useRef(false);
  const wasNearBottomRef = useRef(false);
  // web 上 onEndReached 可能不触发:手动检测滚动接近底部触发分页加载
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScroll(e);
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
    wasNearBottomRef.current = nearBottom;
    if (nearBottom && hasMore) {
      loadAuthors(false);
    }
  };

  async function loadAuthors(reset = false) {
    if (!reset && loadingRef.current) return;
    if (!reset) loadingRef.current = true;
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
          const existingIds = new Set(prev.map((a) => a.id));
          const newItems = results.filter((item) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
        setPage((prev) => prev + 1);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load authors:", error);
    }
    loadingRef.current = false;
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Authors"
        titleAppend={totalCount > 0 ? formatNumber(totalCount) : undefined}
        search={query}
        setSearch={setQuery}
      />

      {/* 排序规则 / 右侧数据含义说明 */}
      <FlatList
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        ref={scrollRef}
        data={authors}
        keyExtractor={(item) => item.id.toString()}
        onScroll={handleScroll}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          if (h <= listHeight && hasMore) {
            loadAuthors(false);
          } else if (wasNearBottomRef.current && hasMore) {
            loadAuthors(false);
          }
        }}
        initialNumToRender={50}
        maxToRenderPerBatch={50}
        windowSize={21}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.tipWrap}>
            <NoteCard>
              作者按代表作点击量从高到低排序。每行右侧的 <NoteStrong>点击量</NoteStrong> 为该作者代表作的累计点击数
            </NoteCard>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.authorItem} onPress={() => router.push(`/authors/${item.id}`)}>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{item.name}</Text>
              {item.top_novel_title && (
                <Text style={styles.topNovel} numberOfLines={1}>
                  Top: {item.top_novel_title}
                </Text>
              )}
            </View>
            <View style={styles.clicksWrap}>
              <Ionicons name="eye-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.clicks}>{formatNumber(item.top_novel_clicks)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          authors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>暂无作者数据</Text>
            </View>
          ) : null
        }
        ListFooterComponent={hasMore ? <LoadingFooter /> : null}
        onEndReached={() => {
          if (hasMore) loadAuthors(false);
        }}
        onEndReachedThreshold={0.5}
      />

      {showButton && <BackToTop onPress={scrollToTop} />}
    </View>
  );
}
