import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../lib/data/database";
import { NovelRow } from "../../components/NovelRow";
import { TabHeader } from "../../components/TabHeader";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { Colors, FontSize, Spacing } from "../../constants/theme";

interface Novel {
  id: number;
  title: string;
  author: string | null;
  genre: number;
  status: number;
  ptype: number;
  word_num: number;
  click_num: number;
  like_num: number;
  praise_num: number;
  review_num: number;
  comment_num: number;
  cover: string | null;
}

const RANKING_TABS = [
  { key: "click_num", label: "点击", icon: "eye-outline" as const },
  { key: "word_num", label: "字数", icon: "document-text-outline" as const },
  { key: "like_num", label: "收藏", icon: "heart-outline" as const },
  { key: "praise_num", label: "点赞", icon: "thumbs-up-outline" as const },
  { key: "review_num", label: "长评", icon: "reader-outline" as const },
  { key: "comment_num", label: "短评", icon: "chatbubble-ellipses-outline" as const },
];

export default function RankingsScreen() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedTab, setSelectedTab] = useState("click_num");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  useEffect(() => {
    setNovels([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    loadRankings(true);
  }, [selectedTab]);

  async function fetchRankings(limit: number, offset: number) {
    const db = await getDatabase();
    return db.getAllAsync<Novel>(
      `SELECT id, title, author, genre, status, ptype, word_num, click_num, like_num, praise_num, review_num, comment_num, cover
       FROM novels
       WHERE ${selectedTab} > 0
       ORDER BY ${selectedTab} DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  async function loadRankings(reset = false) {
    try {
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
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={active ? "#fff" : Colors.textSecondary}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        ref={scrollRef}
        data={novels}
        keyExtractor={(item) => item.id.toString()}
        onScroll={onScroll}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <NovelRow
            novel={item}
            rank={index + 1}
            value={item[selectedTab as keyof Novel] as number}
            valueLabel={currentTab?.label}
          />
        )}
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>加载中...</Text>
            </View>
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

      {showButton && (
        <TouchableOpacity style={styles.backToTop} onPress={scrollToTop}>
          <Ionicons name="arrow-up" size={20} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceBorder,
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
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
});
