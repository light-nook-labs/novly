import { FilterState } from "../../types/models";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NovelRow } from "../../components/NovelRow";
import { EmptyState } from "../../components/EmptyState";
import { TabHeader } from "../../components/TabHeader";
import { PtypeTabs } from "../../components/PtypeTabs";
import { useNovels } from "../../hooks/useNovels";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { getDatabase, subscribeDbReady } from "../../utils/database";
import { Colors, FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { NovelFilterSheet } from "../../components/NovelFilterSheet";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { LoadingFooter } from "../../components/Loading";

const DEFAULT_FILTER: FilterState = {
  genre: null,
  status: null,
  year: null,
  minWordNum: null,
  maxWordNum: null,
  sortBy: "click_num",
  descending: true,
};

export default function NovelsScreen() {
  const { colors } = useTheme();
  // head tab 点击防抖:激活 tab 点击忽略 + 500ms 内重复点击节流
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const { genre, status, ptype } = useLocalSearchParams<{ genre?: string; status?: string; ptype?: string }>();
  const [selectedPtype, setSelectedPtype] = useState<number | null>(ptype ? Number(ptype) : null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTER,
    genre: genre ? Number(genre) : null,
    status: status ? Number(status) : null,
  });
  const [filterVisible, setFilterVisible] = useState(false);
  const { novels, loading, hasMore, loadMore, refresh, error } = useNovels({
    ptype: selectedPtype,
    genre: filters.genre,
    status: filters.status,
    year: filters.year,
    minWordNum: filters.minWordNum,
    maxWordNum: filters.maxWordNum,
    sortBy: filters.sortBy,
    descending: filters.descending,
  });
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  // 大屏:内容不足视口时自动填充(onEndReached 不触发时持续加载直到铺满)
  useEffect(() => {
    if (listHeight > 0 && contentHeight > 0 && contentHeight <= listHeight && hasMore && !loading) {
      loadMore();
    }
  }, [novels, listHeight, contentHeight, hasMore, loading, loadMore]);

  const hasActiveFilters =
    filters.genre !== null ||
    filters.status !== null ||
    filters.year !== null ||
    filters.minWordNum !== null ||
    filters.maxWordNum !== null ||
    filters.sortBy !== "click_num" ||
    !filters.descending;

  useEffect(() => {
    loadCounts();
  }, [filters]);

  // 初始化(冷合并)完成、全量库就位后,重新加载 head tab 的 ptype 计数
  useEffect(() => {
    return subscribeDbReady(() => {
      loadCounts();
    });
  }, []);

  async function loadCounts() {
    try {
      const db = await getDatabase();
      // 按当前筛选条件(除 ptype 外)计算各 tab 的计数,筛选后 count 同步更新
      const conds: string[] = [];
      if (filters.genre !== null) conds.push(`genre = ${filters.genre}`);
      if (filters.status !== null) conds.push(`status = ${filters.status}`);
      if (filters.year !== null) conds.push(`last_update LIKE '${filters.year}%'`);
      if (filters.minWordNum !== null) conds.push(`word_num >= ${filters.minWordNum}`);
      if (filters.maxWordNum !== null) conds.push(`word_num < ${filters.maxWordNum}`);
      const where = conds.length > 0 ? ` WHERE ${conds.join(" AND ")}` : "";
      const total = await db.getFirstAsync<{ v: number }>(`SELECT COUNT(*) as v FROM novels${where}`);
      const rows = await db.getAllAsync<{ ptype: number; v: number }>(
        `SELECT ptype, COUNT(*) as v FROM novels${where} GROUP BY ptype`,
      );
      const map: Record<string, number> = { all: total?.v ?? 0 };
      rows.forEach((r) => {
        map[String(r.ptype)] = r.v;
      });
      setCounts(map);
    } catch (e) {
      console.error("Failed to load ptype counts:", e);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TabHeader
        right={
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
            <Ionicons
              name="options-outline"
              size={22}
              color={hasActiveFilters ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        }
      />

      <PtypeTabs selected={selectedPtype} onSelect={setSelectedPtype} counts={counts} />

      <FlatList
        style={{ flex: 1 }}
        ref={scrollRef}
        data={novels}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        onScroll={onScroll}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setListHeight(h);
          if (contentHeight > 0 && contentHeight <= h && hasMore && !loading) loadMore();
        }}
        onContentSizeChange={(_, h) => {
          setContentHeight(h);
          if (listHeight > 0 && h <= listHeight && hasMore && !loading) {
            loadMore();
          }
        }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        contentContainerStyle={{ paddingVertical: Spacing.sm }}
        renderItem={({ item, index }) => (
          <View
            style={{
              width:
                numColumns > 1 ? `${(100 - ((numColumns - 1) * 16 * 100) / (winWidth || 1)) / numColumns}%` : "100%",
            }}
          >
            <NovelRow novel={item} rank={index + 1} value={item.click_num} valueLabel="点击" />
          </View>
        )}
        ListEmptyComponent={
          error ? (
            <EmptyState icon="cloud-offline-outline" message="加载失败,请检查后重试" onRetry={refresh} />
          ) : !loading ? (
            <EmptyState message="暂无小说" />
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <LoadingFooter />
          ) : !hasMore && novels.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>没有更多了</Text>
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
        onEndReachedThreshold={0.5}
      />

      {showButton && <BackToTop onPress={scrollToTop} />}

      <NovelFilterSheet
        visible={filterVisible}
        filters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={(f) => {
          setFilters(f);
          setFilterVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

    backgroundColor: Colors.background,
  },
  gridRow: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  filterBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceBorder,
    gap: 4,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
  },
  tabCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  tabCountActive: {
    color: "rgba(255,255,255,0.8)",
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    alignSelf: "stretch",
    textAlign: "center",
  },
});
