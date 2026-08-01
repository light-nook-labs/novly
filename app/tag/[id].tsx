import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity , Platform, useWindowDimensions} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { FontSize, Spacing } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/Header";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { useScrollToTop } from "../../hooks/useScrollToTop";

interface Tag {
  id: number;
  name: string;
}

export default function TagDetailScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // web 按窗口宽度动态列数:≥1400 三列,≥900 两列,否则单列;手机恒为单列
  const numColumns = Platform.OS === "web" ? (winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const { id } = useLocalSearchParams();
  const [tag, setTag] = useState<Tag | null>(null);
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
        loadingText: {
          fontSize: FontSize.md,
          color: colors.textTertiary,
        },
        list: {
          paddingBottom: Spacing.xl,
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
    loadTag();
  }, [id]);

  async function loadTag() {
    try {
      const db = await getDatabase();

      const tagResult = await db.getFirstAsync<Tag>(
        "SELECT id, name FROM tags WHERE id = ?",
        [Number(id)]
      );
      setTag(tagResult);

      if (tagResult) {
        await loadNovels(true);
      }
    } catch (error) {
      console.error("Failed to load tag:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadNovels(reset = false) {
    try {
      setLoading(true);
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;

      const results = await db.getAllAsync<NovelRowData>(
        `SELECT n.id, n.title, n.author, n.cover, n.genre, n.status, n.ptype, n.click_num
         FROM novels n
         INNER JOIN novel_tags nt ON n.id = nt.novel_id
         WHERE nt.tag_id = ?
         ORDER BY n.click_num DESC
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
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!tag) {
    return (
      <View style={styles.loading}>
        <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
        <Text style={styles.loadingText}>标签不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tag"
        titleAppend={tag.name}
        onSearchPress={() => router.push("/search")}
      />

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
