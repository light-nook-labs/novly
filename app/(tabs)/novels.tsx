import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NovelRow } from "../../components/NovelRow";
import { EmptyState } from "../../components/EmptyState";
import { TabHeader } from "../../components/TabHeader";
import { useNovels } from "../../hooks/useNovels";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { getDatabase } from "../../utils/database";
import { Colors, FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { NovelFilterSheet } from "../../components/NovelFilterSheet";
import { useTheme } from "../../components/ThemeProvider";

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

export default function NovelsScreen() {
  const { colors } = useTheme();
  const { genre, status, ptype } = useLocalSearchParams<{ genre?: string; status?: string; ptype?: string }>();
  const [selectedPtype, setSelectedPtype] = useState<number | null>(
    ptype ? Number(ptype) : null
  );
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTER,
    genre: genre ? Number(genre) : null,
    status: status ? Number(status) : null,
  });
  const [filterVisible, setFilterVisible] = useState(false);
  const { novels, loading, hasMore, loadMore } = useNovels({
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
  }, []);

  async function loadCounts() {
    try {
      const db = await getDatabase();
      const total = await db.getFirstAsync<{ v: number }>("SELECT COUNT(*) as v FROM novels");
      const rows = await db.getAllAsync<{ ptype: number; v: number }>(
        "SELECT ptype, COUNT(*) as v FROM novels GROUP BY ptype"
      );
      const map: Record<string, number> = { all: total?.v ?? 0 };
      rows.forEach((r) => { map[String(r.ptype)] = r.v; });
      setCounts(map);
    } catch (e) {
      console.error("Failed to load ptype counts:", e);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TabHeader
        right={
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={hasActiveFilters ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        }
      />

      <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
        {PTYPES.map((ptype) => {
          const active = selectedPtype === ptype.key;
          const countKey = ptype.key === null ? "all" : String(ptype.key);
          const count = counts[countKey];
          return (
            <TouchableOpacity
              key={ptype.key?.toString() ?? "all"}
              style={[
                styles.tab,
                { backgroundColor: colors.surfaceBorder },
                active && { backgroundColor: colors.primary },
              ]}
              onPress={() => setSelectedPtype(ptype.key)}
            >
              <Ionicons
                name={ptype.icon}
                size={14}
                color={active ? "#fff" : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: colors.textSecondary }, active && { color: "#fff" }]}>
                {ptype.label}
              </Text>
              {active && count !== undefined && (
                <Text style={[styles.tabCount, styles.tabCountActive]}>
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        ref={scrollRef}
        data={novels}
        keyExtractor={(item) => item.id.toString()}
        onScroll={onScroll}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          if (h <= listHeight && hasMore && !loading) {
            loadMore();
          }
        }}
        contentContainerStyle={{ paddingVertical: Spacing.sm }}
        renderItem={({ item, index }) => (
          <NovelRow novel={item} rank={index + 1} value={item.click_num} valueLabel="点击" />
        )}
        ListEmptyComponent={!loading ? <EmptyState message="暂无小说" /> : null}
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
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

      {showButton && (
        <TouchableOpacity style={styles.backToTop} onPress={scrollToTop}>
          <Ionicons name="arrow-up" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}

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
    backgroundColor: Colors.background,
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
  },
  backToTop: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    elevation: 4,
  },
});
