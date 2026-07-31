import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { FontSize, Spacing } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";
import { PageHeader } from "../../components/Header";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { useScrollToTop } from "../../hooks/useScrollToTop";

interface Contest {
  id: number;
  name: string;
}

export default function ContestDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [contest, setContest] = useState<Contest | null>(null);
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
          flex: 1,
          backgroundColor: colors.background,
        },
        loading: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
          gap: Spacing.md,
        },
        loadingText: {
          fontSize: FontSize.md,
          color: colors.textTertiary,
        },
        list: {
          paddingBottom: Spacing.xl,
        },
        backToTop: {
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          elevation: 4,
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
    loadContest();
  }, [id]);

  async function loadContest() {
    try {
      const db = await getDatabase();

      const contestResult = await db.getFirstAsync<Contest>(
        "SELECT id, name FROM contests WHERE id = ?",
        [Number(id)]
      );
      setContest(contestResult);

      if (contestResult) {
        await loadNovels(true);
      }
    } catch (error) {
      console.error("Failed to load contest:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadNovels(reset = false) {
    try {
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;

      const results = await db.getAllAsync<NovelRowData>(
        `SELECT id, title, author, cover, genre, status, ptype, click_num
         FROM novels WHERE contest_id = ?
         ORDER BY click_num DESC
         LIMIT ? OFFSET ?`,
        [Number(id), PAGE_SIZE, offset]
      );

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
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!contest) {
    return (
      <View style={styles.loading}>
        <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
        <Text style={styles.loadingText}>赛事不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Contest"
        titleAppend={contest.name}
        onSearchPress={() => router.push("/search")}
      />

      <FlatList
        ref={scrollRef}
        data={novels}
        keyExtractor={(item) => item.id.toString()}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          if (h <= listHeight && hasMore) {
            loadNovels(false);
          }
        }}
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

      {showButton && (
        <TouchableOpacity style={styles.backToTop} onPress={scrollToTop}>
          <Ionicons name="arrow-up" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
