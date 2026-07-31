import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Linking } from "react-native";
import { Link, router } from "expo-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { formatNumber, genreMapping, statusMapping, ptypeMapping } from "../../utils/mappings";
import { Colors, FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { Banner, DEFAULT_PINNED, type PinnedBanner } from "../../components/Banner";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { TabHeader } from "../../components/TabHeader";
import { useTheme } from "../../components/ThemeProvider";

interface BannerNovel {
  id: number;
  title: string;
  author: string | null;
}

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
  { key: "contests" as const, icon: "trophy-outline" as const, label: "比赛", color: Colors.primary },
  { key: "genres" as const, icon: "layers-outline" as const, label: "分类", color: Colors.primary },
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
  render: (width, height) => <SurveyCard width={width} height={height} />,
  onPress: () => {
    Linking.openURL(SURVEY_URL).catch(() => {});
  },
};

/** 问卷卡片:图标 + 文案,无 title#id 文字 */
function SurveyCard({ width, height }: { width: number; height: number }) {
  const { colors } = useTheme();
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
  const [bannerNovels, setBannerNovels] = useState<BannerNovel[]>([]);
  const [topNovels, setTopNovels] = useState<NovelRowData[]>([]);
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
  }, []);

  async function loadData() {
    try {
      const db = await getDatabase();

      const banners = await loadBanners(db);
      setBannerNovels(banners);

      const top = await db.getAllAsync<NovelRowData>(
        "SELECT id, title, author, cover, click_num, status, genre, ptype FROM novels ORDER BY click_num DESC LIMIT 10"
      );
      setTopNovels(top);

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
           FROM novels WHERE status IN (2, 3, 4, 5, 6)`
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
        PINNED_BANNER_IDS
      );
    }

    // 2. Fetch random banners, excluding pinned IDs
    const excludeIds = PINNED_BANNER_IDS;
    const remaining = BANNER_COUNT - pinned.length;
    if (remaining <= 0) return pinned.slice(0, BANNER_COUNT);

    const excludeSQL = excludeIds.length > 0
      ? `AND id NOT IN (${excludeIds.map(() => "?").join(",")})`
      : "";
    const params: any[] = excludeIds.length > 0 ? excludeIds : [];

    const random = await db.getAllAsync<BannerNovel>(
      `SELECT id, title, author FROM novels WHERE has_banner = 1 ${excludeSQL} ORDER BY RANDOM() LIMIT ?`,
      [...params, remaining]
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
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
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
          <TouchableOpacity onPress={openSettings} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      <Banner data={bannerNovels} pinned={[DEFAULT_PINNED, SURVEY_PIN]} maxItems={BANNER_COUNT} />

      <View style={[styles.navGrid, { backgroundColor: colors.surface }]}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => router.push(NAV_ROUTES[item.key])}
          >
            <View style={[styles.navIconWrap, { backgroundColor: item.color + "15" }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={[styles.navLabel, { color: colors.text }]}>{item.label}</Text>
            {stats && (
              <Text style={[styles.navCount, { color: colors.textTertiary }]}>
                {formatNumber(stats[item.key as keyof Stats] ?? 0)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>热门排行</Text>
        <Link href="/novels" asChild>
          <TouchableOpacity style={styles.seeAllBtn}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>查看全部</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </Link>
      </View>

      {topNovels.map((novel, index) => (
        <NovelRow
          key={novel.id}
          novel={novel}
          rank={index + 1}
          value={novel.click_num}
          valueLabel="点击"
        />
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  navGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    elevation: 2,
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
