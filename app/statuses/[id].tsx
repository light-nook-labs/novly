import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { FilterState } from "../../types/models";
import { statusMapping, normalizeStatus } from "../../utils/mappings";
import { FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { PageHeader } from "../../components/Header";
import { PtypeTabs } from "../../components/PtypeTabs";
import { NovelFilterSheet } from "../../components/NovelFilterSheet";
import { useNovels } from "../../hooks/useNovels";
import { NovelRow } from "../../components/NovelRow";
import { useScrollToTop } from "../../hooks/useScrollToTop";

const DEFAULT_FILTER: FilterState = {
  genre: null,
  status: null,
  year: null,
  minWordNum: null,
  maxWordNum: null,
  sortBy: "click_num",
  descending: true,
};

export default function StatusDetailScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const { id } = useLocalSearchParams();
  const statusId = Number(id);
  const normStatus = normalizeStatus(statusId);
  const [selectedPtype, setSelectedPtype] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER);
  const [filterVisible, setFilterVisible] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  // 列表数据由 useNovels 统一管理(与 novels 页完全一致)
  const statusIn = normStatus === 4 ? "IN (4, 5)" : normStatus === 2 ? "IN (2, 6)" : "= ?";
  const { novels, loading, hasMore, loadMore } = useNovels({
    ptype: selectedPtype,
    fromClause: "FROM novels",
    extraWhere: [`status ${statusIn}`],
    extraParams: normStatus === 4 || normStatus === 2 ? [] : [normStatus],
    genre: filters.genre,
    year: filters.year,
    minWordNum: filters.minWordNum,
    maxWordNum: filters.maxWordNum,
  });
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const autoFillRef = useRef(false);
  // 大屏:内容不足视口时自动填充(onEndReached 不触发时持续加载直到铺满)
  useEffect(() => {
    if (listHeight > 0 && contentHeight > 0 && contentHeight <= listHeight && hasMore && !loading && !autoFillRef.current) {
      autoFillRef.current = true;
      loadMore();
      setTimeout(() => { autoFillRef.current = false; }, 500);
    }
  }, [novels, listHeight, contentHeight, hasMore, loading, loadMore]);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

          backgroundColor: colors.background,
        },
        loading: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
          gap: Spacing.md,
        },
        list: {
          paddingBottom: Spacing.xl,
        },
        tabBar: {
          flexDirection: "row",
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.surfaceBorder,
          gap: Spacing.sm,
        },
        tab: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.sm,
          borderRadius: BorderRadius.xl,
          backgroundColor: colors.surfaceBorder,
          gap: 4,
        },
        tabActive: {
          backgroundColor: colors.primary,
        },
        tabText: {
          fontSize: FontSize.sm,
          fontWeight: "500",
          color: colors.textSecondary,
        },
        tabTextActive: {
          color: "#fff",
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
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的参数变化执行)
  }, [id, selectedPtype]);

  // head tab 切换(selectedPtype)时重新加载,实现分类过滤
  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的筛选变化执行)
  }, [selectedPtype, filters]);

  async function loadCounts() {
    try {
      const db = await getDatabase();
      const conds: string[] = [];
      if (filters.genre !== null) conds.push(`genre = ${filters.genre}`);
      if (filters.status !== null) conds.push(`status = ${filters.status}`);
      if (filters.year !== null) conds.push(`last_update LIKE '${filters.year}%'`);
      if (filters.minWordNum !== null) conds.push(`word_num >= ${filters.minWordNum}`);
      if (filters.maxWordNum !== null) conds.push(`word_num < ${filters.maxWordNum}`);
      const filterSql = conds.length > 0 ? ` AND ${conds.join(" AND ")}` : "";
      const statusIn = normStatus === 4 ? "IN (4, 5)" : normStatus === 2 ? "IN (2, 6)" : "= ?";
      const p: any[] = normStatus === 4 || normStatus === 2 ? [] : [normStatus];
      const total = await db.getFirstAsync<{ v: number }>(
        `SELECT COUNT(*) as v FROM novels WHERE status ${statusIn}${selectedPtype !== null ? " AND n.ptype = ?" : ""}${filterSql}`,
        p,
      );
      const rows = await db.getAllAsync<{ ptype: number; v: number }>(
        `SELECT ptype, COUNT(*) as v FROM novels WHERE status ${statusIn}${filterSql} GROUP BY ptype`,
        p,
      );
      const map: Record<string, number> = { all: total?.v ?? 0 };
      rows.forEach((r) => {
        map[String(r.ptype)] = r.v;
      });
      setCounts(map);
      console.log("[db] counts:", map);
    } catch (e) {
      console.error("[db] loadCounts failed:", e);
    }
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Status"
        titleAppend={statusMapping[normStatus]}
        right={
          <TouchableOpacity onPress={() => setFilterVisible(true)} hitSlop={8}>
            <Ionicons name="options-outline" size={20} color={colors.text} />
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
        columnWrapperStyle={numColumns > 1 ? { gap: 16, marginBottom: 16 } : undefined}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setListHeight(h);
          if (contentHeight > 0 && contentHeight <= h && hasMore && !loading && !autoFillRef.current) {
            autoFillRef.current = true;
            loadMore();
            setTimeout(() => { autoFillRef.current = false; }, 500);
          }
        }}
        onContentSizeChange={(_, h) => {
          setContentHeight(h);
          if (listHeight > 0 && h <= listHeight && hasMore && !loading && !autoFillRef.current) {
            autoFillRef.current = true;
            loadMore();
            setTimeout(() => { autoFillRef.current = false; }, 500);
          }
        }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        contentContainerStyle={styles.list}
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
        ListFooterComponent={
          novels.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>暂无作品</Text>
            </View>
          ) : null
        }
        onEndReached={() => {
          loadMore();
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
          loadCounts();
        }}
      />
    </View>
  );
}
