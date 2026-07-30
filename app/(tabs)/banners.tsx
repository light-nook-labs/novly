import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  useWindowDimensions,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../lib/data/database";
import { BannerListItem, type BannerNovel } from "../../components/BannerListItem";
import { EmptyState } from "../../components/EmptyState";
import { TabHeader } from "../../components/TabHeader";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { Colors, FontSize, Spacing } from "../../constants/theme";

const PAGE_SIZE = 20;

export default function BannersScreen() {
  const { width: winWidth } = useWindowDimensions();
  const [allBanners, setAllBanners] = useState<BannerNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [reversed, setReversed] = useState(false);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const db = await getDatabase();
      const results = await db.getAllAsync<BannerNovel>(
        "SELECT id, title, author FROM novels WHERE has_banner = 1 ORDER BY click_num DESC"
      );
      setAllBanners(results);
    } catch (e) {
      console.error("Failed to load banners:", e);
    } finally {
      setLoading(false);
    }
  }

  const data = useMemo(() => {
    return reversed ? [...allBanners].reverse() : allBanners;
  }, [allBanners, reversed]);

  return (
    <View style={styles.container}>
      <TabHeader
        onSearchPress={() => router.push("/search/banners")}
        right={
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => {
              setReversed((r) => !r);
              setTimeout(scrollToTop, 50);
            }}
          >
            <Ionicons
              name="swap-vertical"
              size={22}
              color={reversed ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        }
      />

      <FlatList
        ref={scrollRef}
        data={data}
        keyExtractor={(item) => item.id.toString()}
        onScroll={onScroll}
        contentContainerStyle={styles.list}
renderItem={({ item }) => (
  <BannerListItem 
    id={item.id} 
    title={item.title} 
    author={item.author}
    width={winWidth - Spacing.lg * 2}
  />
)}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="images-outline"
              message="暂无背投数据"
            />
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
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
