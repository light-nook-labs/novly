import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, RefreshControl } from "react-native";
import { Link, router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../lib/data/database";
import { formatNumber, genreMapping, statusMapping, ptypeMapping } from "../../utils/mappings";
import { Colors, FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { Banner } from "../../components/Banner";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { TabHeader } from "../../components/TabHeader";

interface BannerNovel {
  id: number;
  title: string;
  author: string | null;
}

interface Stats {
  novels: number;
  authors: number;
  tags: number;
  contests: number;
  genres: number;
  statuses: number;
  ptypes: number;
}

// 固定 banner 不会被随机替换（如网站公告）
const PINNED_BANNER_IDS: number[] = [];

const NAV_ITEMS = [
  { key: "novels", icon: "library-outline" as const, label: "小说", color: Colors.primary },
  { key: "authors", icon: "person-outline" as const, label: "作者", color: Colors.primary },
  { key: "tags", icon: "pricetag-outline" as const, label: "标签", color: Colors.primary },
  { key: "contests", icon: "trophy-outline" as const, label: "比赛", color: Colors.primary },
  { key: "genres", icon: "layers-outline" as const, label: "分类", color: Colors.primary },
  { key: "statuses", icon: "pulse-outline" as const, label: "状态", color: Colors.primary },
  { key: "ptypes", icon: "diamond-outline" as const, label: "类型", color: Colors.primary },
];

const NAV_ROUTES: Record<string, string> = {
  novels: "/novels",
  authors: "/authors",
  tags: "/tags",
  contests: "/contests",
  genres: "/genres",
  statuses: "/statuses",
  ptypes: "/ptypes",
};

const BANNER_COUNT = 5;

export default function HomeScreen() {
  const [bannerNovels, setBannerNovels] = useState<BannerNovel[]>([]);
  const [topNovels, setTopNovels] = useState<NovelRowData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const db = await getDatabase();

      // Load pinned banners + random banners
      const banners = await loadBanners(db);
      setBannerNovels(banners);

      const top = await db.getAllAsync<NovelRowData>(
        "SELECT id, title, author, cover, click_num, status, genre, ptype FROM novels ORDER BY click_num DESC LIMIT 10"
      );
      setTopNovels(top);

      const [n, a, t, c] = await Promise.all([
        db.getFirstAsync<{ v: number }>("SELECT COUNT(*) as v FROM novels"),
        db.getFirstAsync<{ v: number }>("SELECT COUNT(*) as v FROM authors"),
        db.getFirstAsync<{ v: number }>("SELECT COUNT(*) as v FROM tags"),
        db.getFirstAsync<{ v: number }>("SELECT COUNT(*) as v FROM contests"),
      ]);
      setStats({
        novels: n?.v ?? 0,
        authors: a?.v ?? 0,
        tags: t?.v ?? 0,
        contests: c?.v ?? 0,
        genres: Object.keys(genreMapping).length,
        statuses: Object.keys(statusMapping).length,
        ptypes: Object.keys(ptypeMapping).length,
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
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      <TabHeader
        placeholder="搜索小说..."
        right={
          <TouchableOpacity onPress={() => router.push("/settings")} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      <Banner data={bannerNovels} />

      <View style={styles.navGrid}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => router.push(NAV_ROUTES[item.key] as any)}
          >
            <View style={[styles.navIconWrap, { backgroundColor: item.color + "15" }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={styles.navLabel}>{item.label}</Text>
            {stats && (
              <Text style={styles.navCount}>
                {formatNumber(stats[item.key as keyof Stats] ?? 0)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>热门排行</Text>
        <Link href="/novels" asChild>
          <TouchableOpacity style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>查看全部</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  navItem: {
    width: "14.28%",
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
  },
  navCount: {
    fontSize: FontSize.xs - 1,
    color: Colors.textTertiary,
    marginTop: 1,
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
