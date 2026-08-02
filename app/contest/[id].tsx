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
import { FontSize, Spacing } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { Loading, LoadingFooter } from "../../components/Loading";
import { PageHeader } from "../../components/Header";
import { PtypeTabs } from "../../components/PtypeTabs";
import { NovelFilterSheet } from "../../components/NovelFilterSheet";
import { useNovels } from "../../hooks/useNovels";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { useScrollToTop } from "../../hooks/useScrollToTop";

interface Contest {
  id: number;
  name: string;
}

const PTYPES = [
  { key: null, label: "全部", icon: "list-outline" as const },
  { key: 2, label: "免费", icon: "gift-outline" as const },
  { key: 3, label: "签约", icon: "ribbon-outline" as const },
  { key: 4, label: "VIP", icon: "diamond-outline" as const },
];

interface FilterState {
  genre: number | null;
  status: number | null;
  year: number | null;
  minWordNum: number | null;
  maxWordNum: number | null;
  sortBy: string;
  descending: boolean;
}

const DEFAULT_FILTER: FilterState = {
  genre: null,
  status: null,
  year: null,
  minWordNum: null,
  maxWordNum: null,
  sortBy: "click_num",
  descending: true,
};

export default function ContestDetailScreen() {
  const { colors } = useTheme();
  const [selectedPtype, setSelectedPtype] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER);
  const [filterVisible, setFilterVisible] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const lastTabTapRef = useRef(0);
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns = Platform.OS === "web" ? (winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const { id } = useLocalSearchParams();
  const [contest, setContest] = useState<Contest | null>(null);
  // 列表数据由 useNovels 统一管理(与 novels 页完全一致)
  const { novels, loading, hasMore, loadMore } = useNovels({
    ptype: selectedPtype,
    fromClause: "FROM novels",
    extraWhere: ["contest_id = ?"],
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
    loadContest();
  }, [id]);

  async function loadContest() {
    try {
      const db = await getDatabase();

      const contestResult = await db.getFirstAsync<Contest>("SELECT id, name FROM contests WHERE id = ?", [Number(id)]);
      setContest(contestResult);

      if (contestResult) {
      }
    } catch (error) {
      console.error("Failed to load contest:", error);
    } finally {
      loadCounts();
    }
  }

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
        `SELECT COUNT(*) as v FROM novels WHERE contest_id = ?${filterSql}`,
        [Number(id)],
      );
      const rows = await db.getAllAsync<{ ptype: number; v: number }>(
        `SELECT ptype, COUNT(*) as v FROM novels WHERE contest_id = ?${filterSql} GROUP BY ptype`,
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

  if (!contest) {
    if (loading) return <Loading />;
    return (
      <View style={styles.loading}>
        <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
        <Text style={styles.loadingText}>赛事不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Contest"
        titleAppend={contest.name}
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
