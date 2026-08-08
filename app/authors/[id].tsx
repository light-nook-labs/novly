import { AuthorStats } from "../../types/models";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { getDatabase } from "../../utils/database";
import { formatNumber } from "../../utils/mappings";
import { FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { useTheme, type ThemeColors } from "../../components/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { PageHeader } from "../../components/Header";
import { NovelRow, type NovelRowData } from "../../components/NovelRow";
import { DetailSkeleton } from "../../components/Skeleton";

export default function AuthorDetailScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const numColumns =
    Platform.OS === "web" ? (winWidth >= 1800 ? 4 : winWidth >= 1200 ? 3 : winWidth >= 800 ? 2 : 1) : 1;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams();
  const [author, setAuthor] = useState<AuthorStats | null>(null);
  const [novels, setNovels] = useState<NovelRowData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthor();
  }, [id]);

  async function loadAuthor() {
    try {
      const db = await getDatabase();

      const authorResult = await db.getFirstAsync<AuthorStats>(
        `SELECT a.id, a.name, a.top_novel_title, a.top_novel_clicks,
                COUNT(n.id) as novel_count,
                COALESCE(SUM(n.click_num), 0) as total_clicks,
                COALESCE(SUM(n.like_num), 0) as total_likes,
                COALESCE(SUM(n.praise_num), 0) as total_praise
         FROM authors a
         LEFT JOIN novels n ON a.name = n.author
         WHERE a.id = ?
         GROUP BY a.id`,
        [Number(id)],
      );
      setAuthor(authorResult);

      if (authorResult) {
        const novelsResult = await db.getAllAsync<NovelRowData>(
          `SELECT id, title, author, cover, genre, status, ptype,
                  word_num, click_num, like_num, comment_num
           FROM novels WHERE author = ?
           ORDER BY click_num DESC`,
          [authorResult.name],
        );

        // Fetch tags for all novels
        if (novelsResult.length > 0) {
          const ids = novelsResult.map((n) => n.id);
          const placeholders = ids.map(() => "?").join(",");
          const tagRows = await db.getAllAsync<{ novel_id: number; name: string }>(
            `SELECT nt.novel_id, t.name
             FROM novel_tags nt
             JOIN tags t ON nt.tag_id = t.id
             WHERE nt.novel_id IN (${placeholders})
             ORDER BY t.name`,
            ids,
          );
          const tagMap: Record<number, string[]> = {};
          for (const row of tagRows) {
            if (!tagMap[row.novel_id]) tagMap[row.novel_id] = [];
            tagMap[row.novel_id].push(row.name);
          }
          for (const novel of novelsResult) {
            novel.tags = tagMap[novel.id] ?? [];
          }
        }

        setNovels(novelsResult);
      }
    } catch (error) {
      console.error("Failed to load author:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!author) {
    if (loading) {
      return <DetailSkeleton />;
    }
    return (
      <View style={styles.loading}>
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={styles.loadingText}>作者不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title={author.name} />

      <FlatList
        data={novels}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        ListHeaderComponent={
          <View>
            {/* Author Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <StatItem icon="library-outline" label="作品" value={author.novel_count ?? 0} />
                <View style={styles.statDivider} />
                <StatItem icon="flash-outline" label="总点击" value={author.total_clicks} />
                <View style={styles.statDivider} />
                <StatItem icon="heart-outline" label="总收藏" value={author.total_likes} />
                <View style={styles.statDivider} />
                <StatItem icon="thumbs-up-outline" label="总点赞" value={author.total_praise} />
              </View>
            </View>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Novels</Text>
              <Text style={styles.sectionCount}>{novels.length}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <NovelRow novel={item} value={item.click_num} valueLabel="点击" extended />}
        ListFooterComponent={
          novels.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>暂无作品</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={16} color={colors.primary} />
      <Text style={styles.statValue}>{formatNumber(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    gridRow: {
      gap: 16,
      marginBottom: 16,
    },
    container: {
      flex: 1,
      ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

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
      alignSelf: "stretch",
      textAlign: "center",
    },
    // Stats card
    statsCard: {
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.lg,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    statItem: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    statDivider: {
      width: 1,
      height: 36,
      backgroundColor: colors.surfaceBorder,
    },
    statValue: {
      fontSize: FontSize.md,
      fontWeight: "700",
      color: colors.text,
      alignSelf: "stretch",
      textAlign: "center",
    },
    statLabel: {
      fontSize: FontSize.xs,
      color: colors.textTertiary,
      alignSelf: "stretch",
      textAlign: "center",
    },
    // Section
    sectionHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.sm,
      gap: Spacing.xs,
    },
    sectionTitle: {
      fontSize: FontSize.lg,
      fontWeight: "700",
      color: colors.text,
    },
    sectionCount: {
      fontSize: FontSize.sm,
      color: colors.textTertiary,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: Spacing.xl * 2,
      gap: Spacing.md,
    },
    emptyText: {
      fontSize: FontSize.md,
      color: colors.textTertiary,
      alignSelf: "stretch",
      textAlign: "center",
    },
  });
}
