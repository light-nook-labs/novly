import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NovelRow } from "../../components/NovelRow";
import { EmptyState } from "../../components/EmptyState";
import { TabHeader } from "../../components/TabHeader";
import { useNovels } from "../../hooks/useNovels";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { Colors, FontSize, Spacing, BorderRadius } from "../../constants/theme";

const PTYPES = [
  { key: null, label: "全部" },
  { key: 2, label: "免费" },
  { key: 3, label: "签约" },
  { key: 4, label: "VIP" },
];

export default function NovelsScreen() {
  const [selectedPtype, setSelectedPtype] = useState<number | null>(null);
  const { novels, loading, hasMore, loadMore } = useNovels({ ptype: selectedPtype });
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  return (
    <View style={styles.container}>
      <TabHeader />

      <View style={styles.tabBar}>
        {PTYPES.map((ptype) => {
          const active = selectedPtype === ptype.key;
          return (
            <TouchableOpacity
              key={ptype.key?.toString() ?? "all"}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setSelectedPtype(ptype.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {ptype.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        ref={scrollRef}
        data={novels}
        keyExtractor={(item) => item.id.toString()}
        onScroll={onScroll}
        contentContainerStyle={{ paddingVertical: Spacing.sm }}
        renderItem={({ item, index }) => (
          <NovelRow novel={item} rank={index + 1} value={item.click_num} valueLabel="点击" />
        )}
        ListEmptyComponent={!loading ? <EmptyState message="暂无小说" /> : null}
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={Colors.primary} />
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
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceBorder,
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
