import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity , Platform, useWindowDimensions} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { statusMapping, normalizeStatus } from "../../utils/mappings";
import { FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/Header";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { useScrollToTop } from "../../hooks/useScrollToTop";

const PTYPES = [
  { key: null, label: "全部", icon: "list-outline" as const },
  { key: 2, label: "免费", icon: "gift-outline" as const },
  { key: 3, label: "签约", icon: "ribbon-outline" as const },
  { key: 4, label: "VIP", icon: "diamond-outline" as const },
];

export default function StatusDetailScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns = Platform.OS === "web" ? (winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const { id } = useLocalSearchParams();
  const statusId = Number(id);
  const normStatus = normalizeStatus(statusId);
  const [selectedPtype, setSelectedPtype] = useState<number | null>(null);
  const [novels, setNovels] = useState<NovelRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const [listHeight, setListHeight] = useState(0);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,          ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

          backgroundColor: colors.background,
        },
        loading: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
          gap: Spacing.md,
        },
        list: {
          paddingBottom: Spacing.xl,
        },
        tabBar: {
          flexDirection: "row",
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.surfaceBorder,
          gap: Spacing.sm,
        },
        tab: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.sm,
          borderRadius: BorderRadius.xl,
          backgroundColor: colors.surfaceBorder,
          gap: 4,
        },
        tabActive: {
          backgroundColor: colors.primary,
        },
        tabText: {
          fontSize: FontSize.sm,
          fontWeight: "500",
          color: colors.textSecondary,
        },
        tabTextActive: {
          color: "#fff",
        },
        empty: {
          alignItems: "center",
          paddingVertical: Spacing.xl * 2,
          gap: Spacing.md,
        },
        emptyText: {
          fontSize: FontSize.md,
          color: colors.textTertiary,
        },
      }),
    [colors]
  );

  useEffect(() => {
    loadNovels(true);
  }, [id, selectedPtype]);

  async function loadNovels(reset = false) {
    try {
      setLoading(true);
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;

      // 合并带 A 后缀的状态：断更(4)+断更A(5)、已完结(2)+完结A(6)
      const statusIn = normStatus === 4 ? "IN (4, 5)" : normStatus === 2 ? "IN (2, 6)" : "= ?";
      const statusParams: any[] = normStatus === 4 || normStatus === 2 ? [] : [normStatus];

      let sql = `SELECT id, title, author, cover, genre, status, ptype, click_num
                 FROM novels WHERE status ${statusIn}`;
      const params: any[] = [...statusParams];
      if (selectedPtype !== null) {
        sql += " AND ptype = ?";
        params.push(selectedPtype);
      }
      sql += " ORDER BY click_num DESC LIMIT ? OFFSET ?";
      params.push(PAGE_SIZE, offset);

      const results = await db.getAllAsync<NovelRowData>(sql, params);

      if (reset) {
        setNovels(results);
        setPage(1);
      } else {
        setNovels((prev) => [...prev, ...results]);
        setPage((prev) => prev + 1);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load novels:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && novels.length === 0) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Status"
        titleAppend={statusMapping[normStatus]}
        onSearchPress={() => router.push("/search")}
      />

      <View style={styles.tabBar}>
        {PTYPES.map((ptype) => {
          const active = selectedPtype === ptype.key;
          return (
            <TouchableOpacity
              key={ptype.key?.toString() ?? "all"}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setSelectedPtype(ptype.key)}
            >
              <Ionicons
                name={ptype.icon}
                size={14}
                color={active ? "#fff" : colors.textSecondary}
              />
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
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? { gap: 16, marginBottom: 16 } : undefined}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          if (h <= listHeight && hasMore) {
            loadNovels(false);
          }
        }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <NovelRow
            novel={item}
            rank={index + 1}
            value={item.click_num}
            valueLabel="点击"
          />
        )}
        ListFooterComponent={
          novels.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>暂无作品</Text>
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasMore) loadNovels(false);
        }}
        onEndReachedThreshold={0.5}
      />

      {showButton && <BackToTop onPress={scrollToTop} />}
    </View>
  );
}
