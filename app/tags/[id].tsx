import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { Tag, FilterState } from "../../types/models";
import { FontSize, Spacing } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { Loading, LoadingFooter } from "../../components/Loading";
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

export default function TagDetailScreen() {
  const { colors } = useTheme();
  const [selectedPtype, setSelectedPtype] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER);
  const [filterVisible, setFilterVisible] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const { id } = useLocalSearchParams();
  const [tag, setTag] = useState<Tag | null>(null);
  // 列表数据由 useNovels 统一管理(与 novels 页完全一致)
  const { novels, loading, hasMore, loadMore } = useNovels({
    ptype: selectedPtype,
    fromClause: "FROM novels n INNER JOIN novel_tags nt ON n.id = nt.novel_id",
    extraWhere: ["nt.tag_id = ?"],
    extraParams: [Number(id)],
    genre: filters.genre,
    status: filters.status,
    year: filters.year,
    minWordNum: filters.minWordNum,
    maxWordNum: filters.maxWordNum,
  });
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  // 大屏:内容不足视口时自动填充(onEndReached 不触发时持续加载直到铺满)
  useEffect(() => {
    if (listHeight > 0 && contentHeight > 0 && contentHeight <= listHeight && hasMore && !loading) {
      loadMore();
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
        loadingText: {
          fontSize: FontSize.md,
          color: colors.textTertiary,
        },
        list: {
          paddingBottom: Spacing.xl,
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
    loadTag();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的 id 变化执行)
  }, [id]);

  async function loadTag() {
    try {
      const db = await getDatabase();

      const tagResult = await db.getFirstAsync<Tag>("SELECT id, name FROM tags WHERE id = ?", [Number(id)]);
      setTag(tagResult);

      if (tagResult) {
      }
    } catch (error) {
      console.error("Failed to load tag:", error);
    } finally {
      loadCounts();
    }
  }

  // head tab 切换(selectedPtype)时重新加载,实现分类过滤
  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的筛选变化执行)
  }, [selectedPtype, filters]);

  async function loadCounts() {
    try {
      const db = await getDatabase();
      const conds: string[] = [];
      if (filters.genre !== null) conds.push(`n.genre = ${filters.genre}`);
      if (filters.status !== null) conds.push(`n.status = ${filters.status}`);
      if (filters.year !== null) conds.push(`n.last_update LIKE '${filters.year}%'`);
      if (filters.minWordNum !== null) conds.push(`n.word_num >= ${filters.minWordNum}`);
      if (filters.maxWordNum !== null) conds.push(`n.word_num < ${filters.maxWordNum}`);
      const filterSql = conds.length > 0 ? ` AND ${conds.join(" AND ")}` : "";
      const total = await db.getFirstAsync<{ v: number }>(
        `SELECT COUNT(*) as v FROM novels n
         INNER JOIN novel_tags nt ON n.id = nt.novel_id
         WHERE nt.tag_id = ?${filterSql}`,
        [Number(id)],
      );
      const rows = await db.getAllAsync<{ ptype: number; v: number }>(
        `SELECT ptype, COUNT(*) as v FROM novels n
         INNER JOIN novel_tags nt ON n.id = nt.novel_id
         WHERE nt.tag_id = ?${filterSql} GROUP BY ptype`,
        [Number(id)],
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

  if (!tag) {
    if (loading) return <Loading />;
    return (
      <View style={styles.loading}>
        <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
        <Text style={styles.loadingText}>标签不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tag"
        titleAppend={tag.name}
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
        ListEmptyComponent={
          !loading && novels.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>暂无作品</Text>
            </View>
          ) : null
        }
        ListFooterComponent={loading && novels.length > 0 ? <LoadingFooter /> : null}
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
