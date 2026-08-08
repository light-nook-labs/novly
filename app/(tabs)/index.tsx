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
import { Colors, FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { Banner, DEFAULT_PINNED, type PinnedBanner } from "../../components/Banner";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { TabHeader } from "../../components/TabHeader";
import { InfoSheet, InfoBody } from "../../components/InfoSheet";
import { useTheme } from "../../components/ThemeProvider";
import { type BannerNovel } from "../../types/models";
import { groupMoeByYear } from "../../utils/moe";

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
];

const NAV_ROUTES: Record<string, string> = {
  authors: "/authors",
  tags: "/tags",
  contests: "/contests",
  genres: "/genres",
  statuses: "/statuses",
};

const BANNER_COUNT = 6;

// 固定 banner 不会被随机替换（如网站公告）
const PINNED_BANNER_IDS: number[] = [];

// 用户反馈问卷(MS Form)
const SURVEY_URL = "https://forms.cloud.microsoft/r/JfeiiwEYaA";

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
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
        >
          <View
            style={[
              styles.surveyIconWrap,
              { backgroundColor: "rgba(255,255,255,0.2)", width: 96, height: 96, borderRadius: 48 },
            ]}
          >
            <Ionicons name="clipboard-outline" size={48} color="#fff" />
          </View>
          <Text style={[styles.surveyTitle, { fontSize: 30 }]}>用户反馈问卷</Text>
          <Text style={[styles.surveyHint, { fontSize: 18 }]}>点此填写,帮助我们做得更好</Text>
          <View style={styles.surveyProviderRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={[styles.surveyProvider, { fontSize: 14 }]}>由 Microsoft Forms 提供</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.surveyCard, { width, height, backgroundColor: colors.primary }]}>
      <View style={[styles.surveyIconWrap, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
        <Ionicons name="clipboard-outline" size={30} color="#fff" />
      </View>
      <Text style={styles.surveyTitle}>用户反馈问卷</Text>
      <Text style={styles.surveyHint}>点此填写,帮助我们做得更好</Text>
      <View style={styles.surveyProviderRow}>
        <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.85)" />
        <Text style={styles.surveyProvider}>由 Microsoft Forms 提供</Text>
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
  const [moeGrouped, setMoeGrouped] = useState<{ year: string; novels: NovelRowData[] }[]>([]); // 萌神大赛(按年份分组)
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

      const top = await db.getAllAsync<NovelRowData>(
        "SELECT id, title, author, cover, click_num, status, genre, ptype FROM novels WHERE status = 6 ORDER BY RANDOM() LIMIT 12",
      );
      setTopNovels(top);

      // 萌神大赛:获取所有 20xx萌神 标签的 novels(每年2本,按标签年份倒序)
      const moeRows = await db.getAllAsync<NovelRowData & { tag_name: string }>(
        `SELECT DISTINCT n.id, n.title, n.author, n.cover, n.click_num, n.status, n.genre, n.ptype, t.name as tag_name
         FROM novels n
         INNER JOIN novel_tags nt ON n.id = nt.novel_id
         INNER JOIN tags t ON nt.tag_id = t.id
         WHERE t.name LIKE '%萌神'
         ORDER BY t.name DESC, n.click_num DESC`,
      );
      // 按年份分组(纯函数,见 utils/moe.ts)
      const moeGrouped = groupMoeByYear(moeRows);
      setMoeGrouped(moeGrouped);

      const [a, t, c, g, s] = await Promise.all([
        db.getFirstAsync<{ v: number }>("SELECT COUNT(*) as v FROM authors"),
        db.getFirstAsync<{ v: number }>("SELECT COUNT(*) as v FROM tags"),
        db.getFirstAsync<{ v: number }>("SELECT COUNT(*) as v FROM contests"),
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
      const placeholders = PINNED_BANNER_IDS.map(() => "?").join(",");
      pinned = await db.getAllAsync<BannerNovel>(
        `SELECT id, title, author FROM novels WHERE id IN (${placeholders})`,
        PINNED_BANNER_IDS,
      );
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await getDatabase();
      const banners = await loadBanners(db);
      setBannerNovels(banners);
      // 下拉刷新同时刷新完本推荐(完结A 随机 12 本,每次刷新随机变化)
      const top = await db.getAllAsync<NovelRowData>(
        "SELECT id, title, author, cover, click_num, status, genre, ptype FROM novels WHERE status = 6 ORDER BY RANDOM() LIMIT 12",
      );
      setTopNovels(top);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
                    {stats && (
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
                    {stats && (
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

        {/* 书单:在线数据,独立于导航容器,单独卡片 */}
        <TouchableOpacity
          style={[styles.booklistNavItem, { backgroundColor: colors.surface }]}
          onPress={() => router.push("/booklists")}
          activeOpacity={0.7}
        >
          <View style={[styles.booklistNavIconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name={ICONS.booklist} size={22} color={colors.primary} />
          </View>
          <View style={styles.booklistNavTextWrap}>
            <Text style={[styles.booklistNavLabel, { color: colors.text }]}>书单</Text>
            <Text style={[styles.booklistNavSub, { color: colors.textSecondary }]}>来自 SFACG 的在线书单</Text>
          </View>
          <Ionicons name={ICONS.wifi} size={18} color={colors.textTertiary} />
        </TouchableOpacity>

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

        {/* 萌神大赛(按年份分组) */}
        {moeGrouped.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>萌神大赛</Text>
            </View>

            {moeGrouped.map(({ year, novels }) => (
              <View key={year} style={{ marginBottom: 16 }}>
                <View style={[styles.sectionHeader, { marginTop: 0 }]}>
                  <Text style={[styles.sectionSubTitle, { color: colors.textSecondary }]}>{year}</Text>
                </View>
                <View
                  style={{
                    flexDirection: numColumns > 1 ? "row" : "column",
                    flexWrap: numColumns > 1 ? "wrap" : undefined,
                  }}
                >
                  {novels.map((novel, index) => (
                    <View
                      key={novel.id}
                      style={
                        numColumns > 1
                          ? {
                              width: `${100 / numColumns}%`,
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
              </View>
            ))}
          </>
        )}

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
    color: "rgba(255,255,255,0.9)",
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
    color: "rgba(255,255,255,0.85)",
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
  booklistNavItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    marginHorizontal: Platform.OS === "web" ? Spacing.lg : 0,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    elevation: 2,
  },
  booklistNavIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  booklistNavTextWrap: {
    flex: 1,
  },
  booklistNavLabel: {
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  booklistNavSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
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
});
