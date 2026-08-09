import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { NovelRow } from "../../components/NovelRow";
import { type Novel } from "../../types/models";
import { TabHeader } from "../../components/TabHeader";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { FontSize, Spacing } from "../../constants/theme";
import { PAGE_SIZE } from "../../constants/pagination";
import { buildRankingsQuery } from "../../utils/sql";
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
];

export default function RankingsScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedTab, setSelectedTab] = useState("click_num");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  // 分页加载同步锁:FlatList 多触发源(onLayout/onContentSizeChange/onEndReached)并发调用 loadRankings 时,
  // loading 状态异步生效无法阻止同页重复追加(重复 key),用 ref 同步锁防重
  const loadingRef = useRef(false);
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
      }),
    [colors],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tab 切换时重置列表状态(有意为之)
    setNovels([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    loadRankings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的 tab 切换执行)
  }, [selectedTab]);

  async function fetchRankings(limit: number, offset: number) {
    const db = await getDatabase();
    const { query, params } = buildRankingsQuery(selectedTab, limit, offset);
    return db.getAllAsync<Novel>(query, params);
  }

  async function loadRankings(reset = false) {
    if (!reset && loadingRef.current) return;
    if (!reset) loadingRef.current = true;
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
      loadingRef.current = false;
      setLoading(false);
    }
  }

  const currentTab = RANKING_TABS.find((t) => t.key === selectedTab);

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

      <FlatList
        ref={scrollRef}
        data={novels}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={`grid-${numColumns}`}
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
        renderItem={({ item, index }) => (
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
        )}
        ListEmptyComponent={loading ? <Loading /> : null}
        ListFooterComponent={
          loading && novels.length > 0 ? (
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
