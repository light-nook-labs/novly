import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { currentYm, generateMonthsFrom, FIRST_MONTH } from "../../utils/months";
import { NovelRow } from "../../components/NovelRow";
import { type Novel } from "../../types/models";
import { TabHeader } from "../../components/TabHeader";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { ICONS } from "../../constants/icons";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { Loading, LoadingFooter } from "../../components/Loading";

const RANKING_TABS = [
  { key: "click_num", label: "点击", icon: "eye-outline" as const },
  { key: "word_num", label: "字数", icon: "document-text-outline" as const },
  { key: "like_num", label: "收藏", icon: "heart-outline" as const },
  { key: "praise_num", label: "点赞", icon: "thumbs-up-outline" as const },
  { key: "review_num", label: "长评", icon: "reader-outline" as const },
  { key: "comment_num", label: "短评", icon: "chatbubble-outline" as const },
  { key: "monthly", label: "月榜", icon: ICONS.wifi }, // 月份列表,点击进入该月榜单页(在线)
];

const MONTH_PAGE_SIZE = 10; // 月榜分页大小(手动加载更多)

export default function RankingsScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedTab, setSelectedTab] = useState("click_num");
  // 月榜月份列表:起始月 + 分页 + 搜索
  const [monthQuery, setMonthQuery] = useState("");
  const [monthStart, setMonthStart] = useState(() => currentYm());
  const [monthPage, setMonthPage] = useState(1);
  const allMonths = useMemo(() => generateMonthsFrom(monthStart), [monthStart]);
  const visibleMonths = allMonths.slice(0, monthPage * MONTH_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  // 大屏:内容不足视口时自动填充(rankings 用 loadRankings)
  useEffect(() => {
    if (listHeight > 0 && contentHeight > 0 && contentHeight <= listHeight && hasMore && !loading) {
      loadRankings(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(自动填充逻辑)
  }, [novels, listHeight, contentHeight, hasMore, loading]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

          backgroundColor: colors.background,
        },
        tabBar: {
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.surfaceBorder,
        },
        tabScroll: {
          paddingHorizontal: Spacing.md,
          gap: Spacing.xs,
          paddingVertical: Spacing.sm,
        },
        tab: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderRadius: 20,
          gap: 4,
        },
        tabActive: {
          backgroundColor: colors.primary,
        },
        tabText: {
          fontSize: FontSize.sm,
          color: colors.textSecondary,
        },
        tabTextActive: {
          color: "#fff",
          fontWeight: "600",
        },
        list: {
          paddingBottom: Spacing.xl,
        },
        footer: {
          paddingVertical: Spacing.xl,
          alignItems: "center",
        },
        footerText: {
          fontSize: FontSize.sm,
          color: colors.textTertiary,
          alignSelf: "stretch",
          textAlign: "center",
        },
        monthSearch: {
          flexDirection: "row",
          alignItems: "center",
          gap: Spacing.xs,
          marginHorizontal: Spacing.md,
          marginTop: Spacing.sm,
          marginBottom: Spacing.xs,
          paddingHorizontal: Spacing.sm,
          height: 36,
          borderRadius: BorderRadius.sm,
        },
        monthSearchInput: {
          flex: 1,
          padding: 0,
          fontSize: FontSize.md,
        },
        footerArea: {
          alignItems: "center",
          paddingBottom: Spacing.lg,
        },
        endText: {
          fontSize: FontSize.sm,
          fontWeight: "600",
          color: colors.textTertiary,
          paddingVertical: Spacing.md,
        },
        footerBtns: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: Spacing.xl,
        },
        footerBtnText: {
          fontSize: FontSize.md,
          fontWeight: "600",
        },
        backToLatestBtn: {
          paddingVertical: Spacing.lg,
        },
        loadMoreBtn: {
          alignItems: "center",
          paddingVertical: Spacing.lg,
        },
        monthRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.md,
          backgroundColor: colors.surface,
          marginBottom: 1,
        },
        monthText: {
          fontSize: FontSize.md,
          fontWeight: "600",
        },
      }),
    [colors],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tab 切换时重置列表状态(有意为之)
    setNovels([]);
    setPage(0);
    setHasMore(true);
    if (selectedTab === "monthly") {
      // 月榜:月份列表(分页 + 搜索起始月),榜单数据在月份页(monthly/[ym])内按需拉取
      setMonthStart(currentYm());
      setMonthPage(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadRankings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的 tab 切换执行)
  }, [selectedTab]);

  async function fetchRankings(limit: number, offset: number) {
    const db = await getDatabase();
    return db.getAllAsync<Novel>(
      `SELECT id, title, author, genre, status, ptype, word_num, click_num, like_num, praise_num, review_num, comment_num, cover, contest_id, has_banner, last_update
       FROM novels
       WHERE ${selectedTab} > 0
       ORDER BY ${selectedTab} DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
  }

  async function loadRankings(reset = false) {
    if (selectedTab === "monthly") return; // 月榜为月份列表,不走榜单查询
    try {
      setLoading(true);
      const currentPage = reset ? 0 : page;
      const offset = currentPage * PAGE_SIZE;
      const results = await fetchRankings(PAGE_SIZE, offset);

      if (reset) {
        setNovels(results);
        setPage(1);
      } else {
        setNovels((prev) => [...prev, ...results]);
        setPage((prev) => prev + 1);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load rankings:", error);
    } finally {
      setLoading(false);
    }
  }

  const currentTab = RANKING_TABS.find((t) => t.key === selectedTab);

  // 月榜月份列表:回到最新月(重置起始月与分页)
  const backToLatest = () => {
    setMonthStart(currentYm());
    setMonthPage(1);
  };

  // 月榜搜索:支持 YYYY(4位,视为 YYYY12 简写)或 YYYYMM(6位),提交后列表从该月起重新分页
  const handleMonthInput = (v: string) => {
    setMonthQuery(v.replace(/[^0-9]/g, "").slice(0, 6));
  };

  const searchMonth = () => {
    const q = monthQuery;
    setMonthQuery("");
    if (!/^\d{4}$/.test(q) && !/^\d{6}$/.test(q)) return;
    const ym = q.length === 4 ? `${q}12` : q; // yyyy 是 yyyy12 的简写
    const first = FIRST_MONTH;
    if (ym <= currentYm() && ym >= first) {
      setMonthStart(ym);
      setMonthPage(1);
    }
  };

  return (
    <View style={styles.container}>
      <TabHeader />

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {RANKING_TABS.map((tab) => {
            const active = selectedTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setSelectedTab(tab.key)}
              >
                <Ionicons name={tab.icon} size={14} color={active ? "#fff" : colors.textSecondary} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {selectedTab === "monthly" && (
        <View style={[styles.monthSearch, { backgroundColor: colors.surfaceBorder }]}>
          <Ionicons name={ICONS.search} size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.monthSearchInput, { color: colors.text }]}
            placeholder="输入月份,如 202506 或 2025"
            placeholderTextColor={colors.textTertiary}
            value={monthQuery}
            onChangeText={handleMonthInput}
            keyboardType="number-pad"
            returnKeyType="go"
            onSubmitEditing={searchMonth}
          />
        </View>
      )}

      <FlatList
        ref={scrollRef}
        data={(selectedTab === "monthly" ? visibleMonths : novels) as (string | Novel)[]}
        keyExtractor={(item) => (typeof item === "string" ? item : item.id.toString())}
        numColumns={selectedTab === "monthly" ? 1 : numColumns}
        key={`grid-${selectedTab === "monthly" ? 1 : numColumns}`}
        columnWrapperStyle={numColumns > 1 ? { gap: 16, marginBottom: 16 } : undefined}
        onScroll={onScroll}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setListHeight(h);
          if (contentHeight > 0 && contentHeight <= h && hasMore && !loading) loadRankings(false);
        }}
        onContentSizeChange={(_, h) => {
          setContentHeight(h);
          if (listHeight > 0 && h <= listHeight && hasMore && !loading) {
            loadRankings(false);
          }
        }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) =>
          typeof item === "string" ? (
            <TouchableOpacity
              style={styles.monthRow}
              onPress={() => router.push(`/monthly/${item}`)}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthText, { color: colors.text }]}>
                {item.slice(0, 4)}年{Number(item.slice(4, 6))}月
              </Text>
              <Ionicons name={ICONS.jump} size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View
              style={{
                width:
                  numColumns > 1 ? `${(100 - ((numColumns - 1) * 16 * 100) / (winWidth || 1)) / numColumns}%` : "100%",
              }}
            >
              <NovelRow
                novel={item}
                rank={index + 1}
                value={item[selectedTab as keyof Novel] as number}
                valueLabel={currentTab?.label}
              />
            </View>
          )
        }
        ListEmptyComponent={loading ? <Loading /> : null}
        ListFooterComponent={
          selectedTab === "monthly" ? (
            <View style={styles.footerArea}>
              {visibleMonths.length >= allMonths.length && <Text style={styles.endText}>已是最后一期</Text>}
              <View style={styles.footerBtns}>
                <TouchableOpacity style={styles.backToLatestBtn} onPress={backToLatest} activeOpacity={0.7}>
                  <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>回到最新</Text>
                </TouchableOpacity>
                {visibleMonths.length < allMonths.length && (
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    onPress={() => setMonthPage((p) => p + 1)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.footerBtnText, { color: colors.primary }]}>加载更多</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : loading && novels.length > 0 ? (
            <LoadingFooter />
          ) : !hasMore && novels.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>没有更多了</Text>
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasMore && !loading) loadRankings(false);
        }}
        onEndReachedThreshold={0.5}
      />

      {showButton && <BackToTop onPress={scrollToTop} />}
    </View>
  );
}
