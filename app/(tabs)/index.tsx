import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  Platform,
  useWindowDimensions,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ICONS } from "../../constants/icons";
import { getDatabase, subscribeDbReady } from "../../utils/database";
import { formatNumber } from "../../utils/mappings";
import { Colors, FontSize, Spacing, BorderRadius, Layout } from "../../constants/theme";
import { Banner, DEFAULT_PINNED, type PinnedBanner } from "../../components/Banner";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { TabHeader } from "../../components/TabHeader";
import { InfoSheet, InfoBody } from "../../components/InfoSheet";
import { useTheme } from "../../components/ThemeProvider";
import { type BannerNovel, type Booklist } from "../../types/models";
import { parseBooklistItem, BOOKLIST_API, BOOKLIST_EXPAND, BOOKLIST_KNOWN_TOTAL } from "../../utils/booklistApi";
import { SURVEY_URL } from "../../utils/urls";
import { buildCountQuery, buildRandomCompletedQuery, buildNovelsByIdsQuery } from "../../utils/sql";
// 猜你喜欢(已注释):推荐机制不科学,见 utils/recommend.ts 说明
// import { getBookshelf } from "../../utils/bookshelfDb";
// import { buildPreferences, pickForYou } from "../../utils/recommend";

interface Stats {
  authors: number;
  tags: number;
  contests: number;
  genres: number;
  statuses: number;
}

const NAV_ITEMS = [
  { key: "authors" as const, icon: "person-outline" as const, label: "作者", color: Colors.primary },
  { key: "tags" as const, icon: "pricetag-outline" as const, label: "标签", color: Colors.primary },
  { key: "contests" as const, icon: ICONS.contest, label: "比赛", color: Colors.primary },
  { key: "genres" as const, icon: ICONS.genre, label: "分类", color: Colors.primary },
  { key: "statuses" as const, icon: "pulse-outline" as const, label: "状态", color: Colors.primary },
  { key: "booklists" as const, icon: ICONS.booklist, label: "书单", color: Colors.primary },
  { key: "moe" as const, icon: ICONS.star, label: "萌神", color: Colors.primary },
  { key: "monthly" as const, icon: ICONS.wifi, label: "月榜", color: Colors.primary },
];

const NAV_ROUTES: Record<string, string> = {
  authors: "/authors",
  tags: "/tags",
  contests: "/contests",
  genres: "/genres",
  statuses: "/statuses",
  booklists: "/booklists",
  moe: "/moe",
  monthly: "/monthly",
};

const BANNER_COUNT = 6;

// 固定 banner 不会被随机替换（如网站公告）
const PINNED_BANNER_IDS: number[] = [];

/** 第二个固定 banner:用户反馈问卷,点击打开 MS Form */
const SURVEY_PIN: PinnedBanner = {
  id: -2,
  render: (width, height, bgUri) => <SurveyCard width={width} height={height} bgUri={bgUri} />,
  onPress: () => {
    Linking.openURL(SURVEY_URL).catch(() => {});
  },
};

/** 问卷卡片:图标 + 文案。大屏时用抽取的 banner 图做背景、信息放左半部分 */
function SurveyCard({ width, height, bgUri }: { width: number; height: number; bgUri?: string }) {
  const { colors } = useTheme();
  const isWide = width >= 1024;
  if (isWide && bgUri) {
    return (
      <View style={{ width, height, backgroundColor: colors.surfaceBorder }}>
        <Image source={{ uri: bgUri }} style={{ width, height }} resizeMode="cover" />
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: width * 0.5,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.overlay + "59",
          }}
        >
          <View
            style={[
              styles.surveyIconWrap,
              { backgroundColor: colors.overlayLight + "33", width: Layout.iconXl, height: Layout.iconXl, borderRadius: Layout.circleMd },
            ]}
          >
            <Ionicons name="clipboard-outline" size={48} color="#fff" />
          </View>
          <Text style={[styles.surveyTitle, { fontSize: 30 }]}>用户反馈问卷</Text>
          <Text style={[styles.surveyHint, { fontSize: 18, color: colors.overlayLight + "E6" }]}>点此填写,帮助我们做得更好</Text>
          <View style={styles.surveyProviderRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.overlayLight + "D9"} />
            <Text style={[styles.surveyProvider, { fontSize: 14, color: colors.overlayLight + "D9" }]}>由 Microsoft Forms 提供</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.surveyCard, { width, height, backgroundColor: colors.primary }]}>
      <View style={[styles.surveyIconWrap, { backgroundColor: colors.overlayLight + "33" }]}>
        <Ionicons name="clipboard-outline" size={30} color="#fff" />
      </View>
      <Text style={styles.surveyTitle}>用户反馈问卷</Text>
      <Text style={[styles.surveyHint, { color: colors.overlayLight + "E6" }]}>点此填写,帮助我们做得更好</Text>
      <View style={styles.surveyProviderRow}>
        <Ionicons name="shield-checkmark-outline" size={13} color={colors.overlayLight + "D9"} />
        <Text style={[styles.surveyProvider, { color: colors.overlayLight + "D9" }]}>由 Microsoft Forms 提供</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数(与 novels 等列表一致);手机单列
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const isWide = winWidth >= 1024;
  const [bannerNovels, setBannerNovels] = useState<BannerNovel[]>([]);
  const [topNovels, setTopNovels] = useState<NovelRowData[]>([]);
  const [topTipVisible, setTopTipVisible] = useState(false); // 完本推荐说明弹层
  const [recommendBooklists, setRecommendBooklists] = useState<Booklist[]>([]); // 书单推荐(在线随机 12 个)
  // const [forYouNovels, setForYouNovels] = useState<NovelRowData[]>([]); // 猜你喜欢(基于书架偏好,已注释)
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // 防抖:防止快速多次点击导航按钮导致同一页面重复入栈
  const lastNavRef = useRef(0);

  const openSettings = useCallback(() => {
    const now = Date.now();
    if (now - lastNavRef.current < 500) return;
    lastNavRef.current = now;
    router.push("/settings");
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的挂载执行)
  }, []);

  // cold 合并完成(全量库就位)后,重新加载首页数据(nav 统计/排行/banner)
  useEffect(() => {
    return subscribeDbReady(() => {
      loadData();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的挂载执行)
  }, []);

  async function loadData() {
    try {
      const db = await getDatabase();

      const banners = await loadBanners(db);
      setBannerNovels(banners);

      const { query: topQuery, params: topParams } = buildRandomCompletedQuery(12);
      const top = await db.getAllAsync<NovelRowData>(topQuery, topParams);
      setTopNovels(top);

      loadBooklists(); // 书单推荐(在线随机 12 个)
      // loadForYou(); // 猜你喜欢(已注释)

      const [a, t, c, g, s] = await Promise.all([
        db.getFirstAsync<{ v: number }>(buildCountQuery("authors")),
        db.getFirstAsync<{ v: number }>(buildCountQuery("tags")),
        db.getFirstAsync<{ v: number }>(buildCountQuery("contests")),
        // 分类：DB 实际不同的 genre 值（生成 db 时已删除"其他"）
        db.getFirstAsync<{ v: number }>("SELECT COUNT(DISTINCT genre) as v FROM novels"),
        // 状态：与 statuses 页一致，归并 A 变体并排除"其他"/"下架"
        db.getFirstAsync<{ v: number }>(
          `SELECT COUNT(DISTINCT CASE
             WHEN status = 5 THEN 4
             WHEN status = 6 THEN 2
             ELSE status END) as v
           FROM novels WHERE status IN (2, 3, 4, 5, 6)`,
        ),
      ]);
      setStats({
        authors: a?.v ?? 0,
        tags: t?.v ?? 0,
        contests: c?.v ?? 0,
        genres: g?.v ?? 0,
        statuses: s?.v ?? 0,
      });
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }

  async function loadBanners(db: Awaited<ReturnType<typeof getDatabase>>): Promise<BannerNovel[]> {
    // 1. Fetch pinned banners
    let pinned: BannerNovel[] = [];
    if (PINNED_BANNER_IDS.length > 0) {
      const built = buildNovelsByIdsQuery(PINNED_BANNER_IDS, "id, title, author");
      pinned = await db.getAllAsync<BannerNovel>(built.query, built.params);
    }

    // 2. Fetch random banners, excluding pinned IDs
    const excludeIds = PINNED_BANNER_IDS;
    const remaining = BANNER_COUNT - pinned.length;
    if (remaining <= 0) return pinned.slice(0, BANNER_COUNT);

    const excludeSQL = excludeIds.length > 0 ? `AND id NOT IN (${excludeIds.map(() => "?").join(",")})` : "";
    const params: any[] = excludeIds.length > 0 ? excludeIds : [];

    const random = await db.getAllAsync<BannerNovel>(
      `SELECT id, title, author FROM novels WHERE has_banner = 1 ${excludeSQL} ORDER BY RANDOM() LIMIT ?`,
      [...params, remaining],
    );

    // 3. Combine: pinned first, then random
    return [...pinned, ...random];
  }

  // 书单推荐:从 1272 个书单中随机抽取 12 个(在线数据,每次加载随机变化)
  const loadBooklists = useCallback(async () => {
    try {
      const ids = new Set<number>();
      while (ids.size < 12) {
        ids.add(Math.floor(Math.random() * BOOKLIST_KNOWN_TOTAL) + 1);
      }
      const results = await Promise.all(
        [...ids].map(async (id) => {
          try {
            const url = `${BOOKLIST_API}?actionName=${encodeURIComponent(`/bookList/${id}`)}&expand=${encodeURIComponent(BOOKLIST_EXPAND)}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            return parseBooklistItem(await res.json(), id);
          } catch {
            return null;
          }
        }),
      );
      setRecommendBooklists(results.filter((b): b is Booklist => b !== null));
    } catch (error) {
      console.error("Failed to load booklist recommendations:", error);
    }
  }, []);

  /* 猜你喜欢(已注释):推荐机制不科学,待科学方案后恢复
  // 猜你喜欢:基于书架小说的 genre/tag 偏好,本地匹配推荐(离线可用)
  const loadForYou = useCallback(async () => {
    try {
      const shelf = await getBookshelf();
      if (shelf.length === 0) return;
      const shelfIds = shelf.map((n) => n.id);
      const db = await getDatabase();
      const shelfTagRows = await db.getAllAsync<{ novel_id: number; name: string }>(
        `SELECT nt.novel_id, t.name FROM novel_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.novel_id IN (${shelfIds.map(() => "?").join(",")})`,
        shelfIds,
      );
      const tagsByNovel = new Map<number, string[]>();
      for (const r of shelfTagRows) {
        const arr = tagsByNovel.get(r.novel_id) ?? [];
        arr.push(r.name);
        tagsByNovel.set(r.novel_id, arr);
      }
      const prefs = buildPreferences(
        shelf,
        [...tagsByNovel].map(([novelId, tags]) => ({ novelId, tags })),
      );
      // 候选:热度 Top 60,排除已收藏
      const candidates = await db.getAllAsync<NovelRowData>(
        `SELECT id, title, author, cover, click_num, status, genre, ptype FROM novels
         WHERE id NOT IN (${shelfIds.map(() => "?").join(",")}) ORDER BY click_num DESC LIMIT 60`,
        shelfIds,
      );
      if (candidates.length === 0) return;
      const candTagRows = await db.getAllAsync<{ novel_id: number; name: string }>(
        `SELECT nt.novel_id, t.name FROM novel_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.novel_id IN (${candidates.map(() => "?").join(",")})`,
        candidates.map((n) => n.id),
      );
      const candTags = new Map<number, string[]>();
      for (const r of candTagRows) {
        const arr = candTags.get(r.novel_id) ?? [];
        arr.push(r.name);
        candTags.set(r.novel_id, arr);
      }
      const withTags = candidates.map((n) => ({ novel: n, tags: candTags.get(n.id) ?? [] }));
      const picked = pickForYou(withTags, prefs, 8);
      setForYouNovels(picked.map((p) => p.novel));
    } catch (error) {
      console.error("Failed to load for-you:", error);
    }
  }, []);
  */

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await getDatabase();
      const banners = await loadBanners(db);
      setBannerNovels(banners);
      // 下拉刷新同时刷新完本推荐(完结A 随机 12 本,每次刷新随机变化)
      const { query: topQuery, params: topParams } = buildRandomCompletedQuery(12);
      const top = await db.getAllAsync<NovelRowData>(topQuery, topParams);
      setTopNovels(top);
      loadBooklists();
      // loadForYou(); // 猜你喜欢(已注释)
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadBooklists]);

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <TabHeader
          placeholder="搜索小说..."
          right={
            <TouchableOpacity onPress={openSettings} style={styles.settingsBtn} accessibilityLabel="设置">
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          }
        />

        {/* 顶部卡片:banner 与导航网格同一父容器 */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Banner data={bannerNovels} pinned={[DEFAULT_PINNED, SURVEY_PIN]} maxItems={BANNER_COUNT} />

          <View style={[styles.navGrid, isWide && { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl }]}>
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.navItem,
                  isWide && {
                    width: "20%",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: Spacing.sm,
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: Spacing.xs,
                  },
                ]}
                onPress={() => router.push(NAV_ROUTES[item.key])}
              >
                <View
                  style={[
                    styles.navIconWrap,
                    { backgroundColor: item.color + "15" },
                    isWide && { width: 64, height: 64, borderRadius: 18 },
                  ]}
                >
                  <Ionicons name={item.icon} size={isWide ? 32 : 22} color={item.color} />
                </View>
                {isWide ? (
                  <View style={styles.navTextWrap}>
                    <Text
                      style={[
                        styles.navLabel,
                        { color: colors.text },
                        isWide && { fontSize: 16, textAlign: "left", marginTop: 0 },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {stats && stats[item.key as keyof Stats] !== undefined && (
                      <Text
                        style={[
                          styles.navCount,
                          { color: colors.textTertiary },
                          isWide && { fontSize: 15, textAlign: "left", marginTop: 1 },
                        ]}
                      >
                        {formatNumber(stats[item.key as keyof Stats] ?? 0)}
                      </Text>
                    )}
                  </View>
                ) : (
                  <>
                    <Text style={[styles.navLabel, { color: colors.text }]}>{item.label}</Text>
                    {stats && stats[item.key as keyof Stats] !== undefined && (
                      <Text style={[styles.navCount, { color: colors.textTertiary }]}>
                        {formatNumber(stats[item.key as keyof Stats] ?? 0)}
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>完本推荐</Text>
            <TouchableOpacity onPress={() => setTopTipVisible(true)} hitSlop={8} accessibilityLabel="完本推荐说明">
              <Ionicons name={ICONS.tip} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            flexDirection: numColumns > 1 ? "row" : "column",
            flexWrap: numColumns > 1 ? "wrap" : undefined,
          }}
        >
          {topNovels.map((novel, index) => (
            <View
              key={novel.id}
              style={
                numColumns > 1
                  ? {
                      width: `${100 / numColumns}%`, // 百分比均分,基于容器实际宽度(含滚动条自适应)
                      paddingRight: (index + 1) % numColumns !== 0 ? 16 : 0,
                      paddingBottom: 16,
                    }
                  : undefined
              }
            >
              <NovelRow novel={novel} unordered value={novel.click_num} valueLabel="点击" />
            </View>
          ))}
        </View>

        {/* 猜你喜欢(已注释):推荐机制不科学,待科学方案后恢复 */}

        {/* 书单推荐(在线随机 12 个) */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>书单推荐</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/booklists")} hitSlop={8}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>全部</Text>
          </TouchableOpacity>
        </View>
        {recommendBooklists.map((booklist) => (
          <TouchableOpacity
            key={booklist.bookListID}
            style={[styles.recommendBooklistRow, { backgroundColor: colors.surface }]}
            onPress={() => router.push(`/booklists/${booklist.bookListID}`)}
            activeOpacity={0.7}
          >
            <View style={styles.recommendBooklistTextWrap}>
              <Text style={[styles.recommendBooklistTitle, { color: colors.text }]} numberOfLines={1}>
                <Text style={[styles.recommendBooklistId, { color: colors.primary }]}>#{booklist.bookListID} </Text>
                {booklist.title}
              </Text>
              {booklist.summary ? (
                <Text style={[styles.recommendBooklistSummary, { color: colors.textSecondary }]} numberOfLines={2}>
                  {booklist.summary}
                </Text>
              ) : null}
              <View style={styles.recommendBooklistMetaRow}>
                {booklist.avatar ? (
                  <Image
                    source={{ uri: booklist.avatar }}
                    style={[styles.recommendBooklistAvatar, { backgroundColor: colors.surfaceBorder }]}
                  />
                ) : null}
                {booklist.nickName ? (
                  <Text style={[styles.recommendBooklistMetaText, { color: colors.textSecondary }]}>
                    {booklist.nickName}
                  </Text>
                ) : null}
                {booklist.vipLevel > 0 ? (
                  <Text style={[styles.recommendBooklistMetaText, { color: colors.primary, fontWeight: "600" }]}>
                    VIP
                  </Text>
                ) : null}
                <Text style={[styles.recommendBooklistMetaText, { color: colors.textSecondary }]}>
                  {booklist.novelNum} 部作品
                </Text>
                <Text style={[styles.recommendBooklistMetaText, { color: colors.textSecondary }]}>
                  {formatNumber(booklist.markNum)} 收藏
                </Text>
                {booklist.recommendNum > 0 && (
                  <Text style={[styles.recommendBooklistMetaText, { color: colors.textSecondary }]}>
                    {formatNumber(booklist.recommendNum)} 推荐
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name={ICONS.jump} size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 完本推荐说明弹层 */}
      <InfoSheet visible={topTipVisible} onClose={() => setTopTipVisible(false)} title="完本推荐说明">
        <InfoBody>完本推荐从「完结A」状态的小说中随机抽取 12 本展示。</InfoBody>
        <InfoBody>每次下拉刷新都会重新随机抽取一批,所以每次看到的推荐可能不同。</InfoBody>
      </InfoSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

    backgroundColor: Colors.background,
  },
  surveyCard: {
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
  },
  surveyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  surveyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  surveyHint: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  surveyProviderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.md,
  },
  surveyProvider: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    textAlign: "center",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    // banner + 导航网格 同一父容器,整块卡片背景(背景色在 JSX 内联)
    marginHorizontal: Platform.OS === "web" ? Spacing.lg : 0,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    elevation: 2,
  },
  navGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  navItem: {
    width: "20%",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  navIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  navLabel: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: 6,
    alignSelf: "stretch",
    textAlign: "center",
  },
  navCount: {
    fontSize: FontSize.xs - 1,
    color: Colors.textTertiary,
    marginTop: 1,
    alignSelf: "stretch",
    textAlign: "center",
  },
  navTextWrap: {
    flex: 1,
    alignItems: "flex-start",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  sectionSubTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  recommendBooklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: 1,
  },
  recommendBooklistTextWrap: {
    flex: 1,
  },
  recommendBooklistId: {
    fontWeight: "600",
  },
  recommendBooklistTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  recommendBooklistSummary: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  recommendBooklistMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 4,
    flexWrap: "wrap",
  },
  recommendBooklistAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  recommendBooklistMetaText: {
    fontSize: FontSize.xs,
  },
});
