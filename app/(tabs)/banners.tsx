import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  useWindowDimensions,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TAB_ICONS } from "../../constants/tabIcons";
import { getDatabase } from "../../utils/database";
import { BannerListItem, type BannerNovel } from "../../components/BannerListItem";
import { EmptyState } from "../../components/EmptyState";
import { TabHeader } from "../../components/TabHeader";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { Colors, FontSize, Spacing } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { LoadingFooter } from "../../components/Loading";

const PAGE_SIZE = 10;

export default function BannersScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数(与其他列表页一致);手机单列
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  // 列表项宽度:多列时按列数均分(含列间距),单列时占满容器
  const itemW =
    numColumns > 1 ? (winWidth - Spacing.lg * 2 - 16 * (numColumns - 1)) / numColumns : winWidth - Spacing.lg * 2;
  const [allBanners, setAllBanners] = useState<BannerNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [reversed, setReversed] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [listHeight, setListHeight] = useState(0);
  // 并发锁:防止 handleScroll/onContentSizeChange 等多次触发导致重复加载/跳页
  const loadingRef = useRef(false);
  // web 上 contentSize 可能滞后:记录上次滚动是否接近底部,内容增长后兜底继续加载
  const wasNearBottomRef = useRef(false);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  useEffect(() => {
    loadBanners(true);
  }, []);

  async function loadBanners(reset = false) {
    if (!reset && loadingRef.current) return;
    if (!reset) loadingRef.current = true;
    try {
      setLoading(true);
      const db = await getDatabase();
      const offset = (reset ? 0 : page) * PAGE_SIZE;
      console.log(`[banners] loadBanners reset=${reset} page=${page} offset=${offset} 累计=${allBanners.length}`);
      // reverse 时按升序查询(倒序浏览),正序时降序;均分页加载,避免全量渲染 DOM
      const order = reversed ? "ASC" : "DESC";
      const results = await db.getAllAsync<BannerNovel>(
        `SELECT id, title, author FROM novels WHERE has_banner = 1 ORDER BY click_num ${order} LIMIT ? OFFSET ?`,
        [PAGE_SIZE, offset],
      );
      console.log(
        `[banners] 返回 ${results.length} 条, hasMore=${results.length === PAGE_SIZE}, 新累计=${reset ? results.length : allBanners.length + results.length}`,
      );
      if (reset) {
        setAllBanners(results);
        setPage(1);
      } else {
        setAllBanners((prev) => [...prev, ...results]);
        setPage((p) => p + 1);
      }
      setHasMore(results.length === PAGE_SIZE);
    } catch (e) {
      console.error("Failed to load banners:", e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  // reverse 切换时按新方向重新分页加载(正序 DESC / 倒序 ASC)
  useEffect(() => {
    loadBanners(true);
  }, [reversed]);

  // reverse 时查询方向已取反,无需再 useMemo 反转;数据即排序结果
  const data = allBanners;

  // web 上 FlatList 的 onEndReached 可能不触发,手动检测滚动接近底部触发分页加载
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScroll(e);
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
    wasNearBottomRef.current = nearBottom;
    console.log(
      `[banners] scroll y=${contentOffset.y.toFixed(0)} viewH=${layoutMeasurement.height.toFixed(0)} contentH=${contentSize.height.toFixed(0)} nearBottom=${nearBottom} hasMore=${hasMore} loading=${loading}`,
    );
    if (nearBottom && hasMore && !loading) {
      loadBanners(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TabHeader
        onSearchPress={() => router.push("/search/banners")}
        right={
          <TouchableOpacity
            style={styles.sortBtn}
            disabled={reversing}
            onPress={() => {
              // 翻转期间禁止滑动,避免用户误以为按钮未生效
              setReversing(true);
              setReversed((r) => !r);
              setTimeout(() => {
                scrollToTop();
                setTimeout(() => setReversing(false), 400);
              }, 50);
            }}
          >
            <Ionicons name="swap-vertical" size={22} color={reversed ? Colors.primary : Colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        ref={scrollRef}
        data={data}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        // web 上 FlatList 分批渲染可能停滞(data 更新但渲染不跟进),
        // 加大初始渲染数/每批渲染数/窗口,确保新增 item 持续渲染
        initialNumToRender={50}
        maxToRenderPerBatch={50}
        windowSize={21}
        scrollEnabled={!reversing}
        onScroll={handleScroll}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          // 内容不满一屏:自动填充下一页
          if (h <= listHeight + 200 && hasMore && !loading) {
            loadBanners(false);
          } else if (wasNearBottomRef.current && hasMore && !loading) {
            // web 兜底:此前滚动已接近底部但 contentSize 滞后未触发,
            // 内容增长后继续加载,直至用户滚回中部
            loadBanners(false);
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
        ListEmptyComponent={!loading ? <EmptyState icon={TAB_ICONS.banners} message="暂无背投数据" /> : null}
        ListFooterComponent={loading ? <LoadingFooter /> : null}
      />

      {showButton && <BackToTop onPress={scrollToTop} />}
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
  sortBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
});
