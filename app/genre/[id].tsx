import { FilterState } from "../../types/models";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { genreMapping } from "../../utils/mappings";
import { FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/Header";
import { PtypeTabs } from "../../components/PtypeTabs";
import { NovelFilterSheet } from "../../components/NovelFilterSheet";
import { useNovels } from "../../hooks/useNovels";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { useScrollToTop } from "../../hooks/useScrollToTop";

const PTYPES = [
  { key: null, label: "全部", icon: "list-outline" as const },
  { key: 2, label: "免费", icon: "gift-outline" as const },
  { key: 3, label: "签约", icon: "ribbon-outline" as const },
  { key: 4, label: "VIP", icon: "diamond-outline" as const },
];



const DEFAULT_FILTER: FilterState = {
  genre: null,
  status: null,
  year: null,
  minWordNum: null,
  maxWordNum: null,
  sortBy: "click_num",
  descending: true,
};

export default function GenreDetailScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns = Platform.OS === "web" ? (winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const { id } = useLocalSearchParams();
  const genreId = Number(id);
  const [selectedPtype, setSelectedPtype] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER);
  const [filterVisible, setFilterVisible] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  // 列表数据由 useNovels 统一管理(与 novels 页完全一致)
  const { novels, loading, hasMore, loadMore } = useNovels({
    ptype: selectedPtype,
    fromClause: "FROM novels",
    extraWhere: ["genre = ?"],
    extraParams: [Number(id)],
    genre: filters.genre,
    status: filters.status,
    year: filters.year,
    minWordNum: filters.minWordNum,
    maxWordNum: filters.maxWordNum,
  });
  const [listHeight, setListHeight] = useState(0);
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
  }, [id, selectedPtype]);

  // head tab 切换(selectedPtype)时重新加载,实现分类过滤
  useEffect(() => {
    loadCounts();
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
        `SELECT COUNT(*) as v FROM novels WHERE genre = ?${filterSql}`,
        [Number(id)],
      );
      const rows = await db.getAllAsync<{ ptype: number; v: number }>(
        `SELECT ptype, COUNT(*) as v FROM novels WHERE genre = ?${filterSql} GROUP BY ptype`,
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


  return (
    <View style={styles.container}>
      <PageHeader
        title="Genre"
        titleAppend={genreMapping[genreId]}
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
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          if (h <= listHeight && hasMore && !loading) {
            loadMore();
          }
        }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <NovelRow novel={item} rank={index + 1} value={item.click_num} valueLabel="点击" />
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
