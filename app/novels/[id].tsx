import { Novel, Tag, Contest } from "../../types/models";
// 相似推荐(已注释):推荐机制不科学,待 nookdata 补充简介等数据后做 NLP/机器学习
// import { NovelRow, type NovelRowData } from "../../components/NovelRow";
// import { pickSimilar } from "../../utils/recommend";
import { NOVEL_DETAIL_QUERY } from "../../utils/sql";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Platform, Alert, Share } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { getDatabase } from "../../utils/database";
import { isInBookshelf as isInBookshelfDb, addToBookshelf, removeFromBookshelf } from "../../utils/bookshelfDb";
import { formatNumber, statusMapping, genreMapping, ptypeMapping } from "../../utils/mappings";
import { StatusBadge, Badge, tagColor } from "../../components/Badge";
import { coverUrl, bannerUrl, novelDetailUrl } from "../../utils/urls";
import { FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { PageHeader } from "../../components/Header";
import { useTheme, type ThemeColors } from "../../components/ThemeProvider";
import { Cover } from "../../components/Cover";
import { ID } from "../../components/ID";
import { ImageLightbox } from "../../components/ImageLightbox";
import { DetailSkeleton } from "../../components/Skeleton";

// 规范化 last_update 时间（原始格式: 2024-12-27 19:14:23+00:00）
function formatUpdateTime(raw: string): string {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:[+-]\d{2}:?\d{2}|Z)?$/);
  if (!m) return raw;
  const [, y, mo, d] = m;
  // 带时区后缀时视为 UTC，转为本地日期
  const date = /[+-]\d{2}:?\d{2}|Z$/.test(raw)
    ? new Date(`${y}-${mo}-${d}T00:00:00Z`)
    : new Date(Number(y), Number(mo) - 1, Number(d));
  if (isNaN(date.getTime())) return raw;

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function NovelDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  // const [similarNovels, setSimilarNovels] = useState<NovelRowData[]>([]); // 相似推荐(已注释)
  const [contest, setContest] = useState<Contest | null>(null);
  const [authorId, setAuthorId] = useState<number | null>(null);
  const [isInBookshelf, setIsInBookshelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<Record<string, number>>({});

  const handleCopyTitle = () => {
    if (novel?.title) {
      Clipboard.setStringAsync(novel.title);
      Toast.show({
        type: "success",
        text1: "已复制标题",
        text2: novel.title,
        position: "top",
      });
    }
  };

  const handleOpenSFACG = () => {
    // Copy title first
    if (novel?.title) {
      Clipboard.setStringAsync(novel.title);
      Toast.show({
        type: "success",
        text1: "已复制标题",
        text2: novel.title,
        position: "top",
      });
    }

    const webUrl = novelDetailUrl(Number(id));

    if (Platform.OS === "web") {
      // Web: directly open
      Linking.openURL(webUrl);
    } else if (Platform.OS === "android") {
      // Mobile: show options
      // 菠萝包轻小说注册的深链: sfacg://m.sfacg.com/novel/{id} / sf://m.sfacg.com/novel/{id}
      const appUrl = `sfacg://m.sfacg.com/novel/${id}`;
      Alert.alert("打开方式", "选择打开方式", [
        { text: "在 App 中打开", onPress: () => Linking.openURL(appUrl) },
        { text: "在浏览器中打开", onPress: () => Linking.openURL(webUrl) },
      ]);
    } else {
      // iOS: show single option
      Alert.alert("打开方式", "选择打开方式", [{ text: "在浏览器中打开", onPress: () => Linking.openURL(webUrl) }]);
    }
  };

  const handleShare = async () => {
    const url = novelDetailUrl(Number(id));
    const title = novel?.title ?? `Novel #${id}`;

    if (Platform.OS === "web") {
      // Web: use navigator.share if available, otherwise copy URL
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text: title, url });
          return;
        } catch {
          // User cancelled or share unavailable — fall through to copy
        }
      }
      await Clipboard.setStringAsync(url);
      Toast.show({ type: "success", text1: "链接已复制", text2: url, position: "top" });
      return;
    }

    // Native: use Share API
    Share.share({ title, message: `${title}\n${url}`, url });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- React Compiler 规则标记既有加载模式,数据更新为有意为之
    loadAll();
    // eslint-disable-next-line react-hooks/immutability -- React Compiler 规则标记既有加载模式,数据更新为有意为之
    checkBookshelf();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的 id 变化执行)
  }, [id]);

  async function loadAll() {
    try {
      const db = await getDatabase();

      const result = await db.getFirstAsync<Novel>(NOVEL_DETAIL_QUERY, [Number(id)]);
      setNovel(result);

      if (result) {
        // Author id (for navigation to author detail)
        if (result.author) {
          const authorRow = await db.getFirstAsync<{ id: number }>("SELECT id FROM authors WHERE name = ? LIMIT 1", [
            result.author,
          ]);
          setAuthorId(authorRow?.id ?? null);
        }

        // Tags
        const tagRows = await db.getAllAsync<Tag>(
          `SELECT t.id, t.name FROM tags t
           INNER JOIN novel_tags nt ON t.id = nt.tag_id
           WHERE nt.novel_id = ?
           ORDER BY t.name`,
          [Number(id)],
        );
        setTags(tagRows);

        /* 相似推荐(已注释):推荐机制不科学,待机器学习方案后恢复
        // 相似推荐:同 genre 或同 tag 的候选(本地计算,权重见 utils/recommend.ts)
        if (tagRows.length > 0) {
          const tagIds = tagRows.map((t) => t.id);
          const tagPh = tagIds.map(() => "?").join(",");
          const candidateRows = await db.getAllAsync<NovelRowData>(
            `SELECT id, title, author, cover, click_num, status, genre, ptype FROM novels
             WHERE genre = ? OR id IN (SELECT novel_id FROM novel_tags WHERE tag_id IN (${tagPh}))
             ORDER BY click_num DESC LIMIT 40`,
            [result.genre, ...tagIds],
          );
          if (candidateRows.length > 0) {
            const candidateIds = candidateRows.map((n) => n.id);
            const idPh = candidateIds.map(() => "?").join(",");
            const candidateTags = await db.getAllAsync<{ novel_id: number; name: string }>(
              `SELECT nt.novel_id, t.name FROM novel_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.novel_id IN (${idPh})`,
              candidateIds,
            );
            const tagsByNovel = new Map<number, string[]>();
            for (const r of candidateTags) {
              const arr = tagsByNovel.get(r.novel_id) ?? [];
              arr.push(r.name);
              tagsByNovel.set(r.novel_id, arr);
            }
            const withTags = candidateRows.map((n) => ({ novel: n, tags: tagsByNovel.get(n.id) ?? [] }));
            const picked = pickSimilar(withTags, result.genre, tagRows.map((t) => t.name), Number(id), 6);
            setSimilarNovels(picked.map((p) => p.novel));
          }
        }
        */

        // Contest
        if (result.contest_id) {
          const c = await db.getFirstAsync<Contest>("SELECT id, name FROM contests WHERE id = ?", [result.contest_id]);
          setContest(c);
        }

        // Rankings: rank = count of novels with higher value + 1
        const rankFields: [string, number | null][] = [
          ["click", result.click_num],
          ["like", result.like_num],
          ["praise", result.praise_num],
          ["comment", result.comment_num],
          ["word", result.word_num],
          ["review", result.review_num],
        ];
        const rankMap: Record<string, number> = {};
        for (const [key, value] of rankFields) {
          if (value != null && value > 0) {
            const r = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM novels WHERE ${key}_num > ?`, [
              value,
            ]);
            rankMap[key] = (r?.c ?? 0) + 1;
          }
        }
        setRankings(rankMap);
      }
    } catch (error) {
      console.error("Failed to load novel:", error);
    } finally {
      setLoading(false);
    }
  }

  async function checkBookshelf() {
    try {
      setIsInBookshelf(await isInBookshelfDb(Number(id)));
    } catch (error) {
      console.error("Failed to check bookshelf:", error);
    }
  }

  async function toggleBookshelf() {
    try {
      if (isInBookshelf) {
        await removeFromBookshelf(Number(id));
        setIsInBookshelf(false);
      } else if (novel) {
        await addToBookshelf({
          id: novel.id,
          title: novel.title,
          author: novel.author,
          cover: novel.cover,
          genre: novel.genre,
          status: novel.status,
          ptype: novel.ptype,
          click_num: novel.click_num,
          word_num: novel.word_num,
          like_num: novel.like_num,
          last_update: novel.last_update,
        });
        setIsInBookshelf(true);
      }
    } catch (error) {
      console.error("Failed to update bookshelf:", error);
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!novel) {
    return (
      <View style={styles.loading}>
        <Ionicons name="book-outline" size={48} color={colors.textMuted} />
        <Text style={styles.loadingText}>小说不存在</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title={novel.title} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cover + basic info */}
        <View style={styles.heroSection}>
          <ImageLightbox uri={coverUrl(novel.cover)}>
            <Cover cover={novel.cover} width={100} height={140} borderRadius={BorderRadius.md} />
          </ImageLightbox>
          <View style={styles.heroInfo}>
            <View style={styles.titleRow}>
              <TouchableOpacity onPress={handleCopyTitle} style={styles.titleButton}>
                <Text style={styles.title}>
                  {novel.title}
                  <ID id={novel.id} weight="700" />
                </Text>
              </TouchableOpacity>
            </View>
            {novel.author && (
              <TouchableOpacity
                onPress={() => {
                  if (authorId !== null) {
                    router.push(`/authors/${authorId}`);
                  }
                }}
                style={styles.authorRow}
              >
                <Ionicons name="person-outline" size={14} color={colors.primary} />
                <Text style={styles.author}>{novel.author}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.badgeRow}>
              <TouchableOpacity onPress={() => router.push(`/statuses/${novel.status}`)}>
                <StatusBadge statusId={novel.status} label={statusMapping[novel.status] ?? "其他"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push(`/genres/${novel.genre}`)}>
                {genreMapping[novel.genre] && <Badge label={genreMapping[novel.genre]} variant="genre" />}
              </TouchableOpacity>
              {novel.ptype > 1 && (
                <TouchableOpacity onPress={() => router.push(`/novels?ptype=${novel.ptype}`)}>
                  <Badge label={ptypeMapping[novel.ptype] ?? ""} variant="ptype" />
                </TouchableOpacity>
              )}
            </View>
            {tags.length > 0 && (
              <View style={styles.tagRow}>
                {tags.map((tag, i) => (
                  <TouchableOpacity key={tag.id} onPress={() => router.push(`/tags/${tag.id}`)} activeOpacity={0.7}>
                    <Badge label={tag.name} variant="tag" color={tagColor(colors, i)} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {novel.has_banner === 1 && (
              <View style={styles.bannerRow}>
                <ImageLightbox uri={bannerUrl(novel.id)}>
                  <View style={styles.bannerLink}>
                    <Ionicons name="images-outline" size={12} color={colors.primary} />
                    <Text style={styles.bannerLinkText}>查看背投</Text>
                    <Ionicons name="expand-outline" size={12} color={colors.textTertiary} />
                  </View>
                </ImageLightbox>
              </View>
            )}
          </View>
        </View>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatItem icon="eye-outline" label="点击" value={novel.click_num} rank={rankings.click} />
            <StatItem icon="heart-outline" label="收藏" value={novel.like_num} rank={rankings.like} />
            <StatItem icon="thumbs-up-outline" label="点赞" value={novel.praise_num} rank={rankings.praise} />
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsRow}>
            <StatItem icon="chatbubble-outline" label="评论" value={novel.comment_num} rank={rankings.comment} />
            <StatItem icon="document-text-outline" label="字数" value={novel.word_num} rank={rankings.word} />
            <StatItem icon="reader-outline" label="长评" value={novel.review_num} rank={rankings.review} />
          </View>
        </View>

        {/* Contest */}
        {contest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>所属赛事</Text>
            <TouchableOpacity style={styles.contestRow} onPress={() => router.push(`/contests/${contest.id}`)}>
              <Ionicons name="trophy-outline" size={18} color={colors.primary} />
              <Text style={styles.contestName}>{contest.name}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* 在 SFACG 阅读 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>在 SFACG 阅读</Text>
          <TouchableOpacity style={styles.contestRow} onPress={handleOpenSFACG}>
            <Ionicons name="open-outline" size={18} color={colors.primary} />
            <Text style={styles.contestName}>打开原文</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Rankings hint */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>榜单排名</Text>
          <TouchableOpacity style={styles.rankingsRow} onPress={() => router.push(`/(tabs)/rankings`)}>
            <Ionicons name="podium-outline" size={18} color={colors.primary} />
            <View style={styles.rankingsInfo}>
              <Text style={styles.rankingsLabel}>查看全站排行</Text>
              <Text style={styles.rankingsDesc}>点击、收藏、点赞等多维度排名</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, isInBookshelf && styles.actionBtnActive]}
              onPress={toggleBookshelf}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isInBookshelf ? "bookmark" : "bookmark-outline"}
                size={20}
                color={isInBookshelf ? "#fff" : colors.primary}
              />
              <Text style={[styles.actionBtnText, isInBookshelf && styles.actionBtnTextActive]}>
                {isInBookshelf ? "已在书架" : "加入书架"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
              <Text style={styles.actionBtnText}>分享</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Meta info */}
        <View style={styles.metaSection}>
          {novel.last_update && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>最后更新</Text>
              <Text style={styles.metaValue}>{formatUpdateTime(novel.last_update)}</Text>
            </View>
          )}
        </View>

        {/* 相似推荐(已注释):推荐机制不科学,待机器学习方案后恢复 */}
      </ScrollView>
    </View>
  );
}

function StatItem({
  icon,
  label,
  value,
  valueSuffix,
  textOverride,
  rank,
}: {
  icon: string;
  label: string;
  value: number | null;
  valueSuffix?: string;
  textOverride?: string;
  rank?: number;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={16} color={colors.primary} />
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>
          {textOverride ?? (value != null ? formatNumber(value) + (valueSuffix ?? "") : "-")}
        </Text>
        {rank !== undefined && <Text style={styles.statRank}>#{rank}</Text>}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: Spacing.xl * 2,
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
    // Hero
    heroSection: {
      flexDirection: "row",
      padding: Spacing.lg,
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.lg,
      borderRadius: BorderRadius.md,
      gap: Spacing.lg,
    },
    heroInfo: {
      flex: 1,
      gap: Spacing.sm,
    },
    title: {
      fontSize: FontSize.xl,
      fontWeight: "700",
      color: colors.text,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 4,
    },
    titleButton: {
      flex: 1,
      flexShrink: 1,
    },
    authorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    author: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.primary,
      paddingHorizontal: 2,
    },
    badgeRow: {
      flexDirection: "row",
      gap: Spacing.xs,
      flexWrap: "wrap",
    },
    // Stats
    statsCard: {
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.lg,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.lg,
    },
    statsRow: {
      flexDirection: "row",
      paddingHorizontal: Spacing.sm,
    },
    statsDivider: {
      height: 1,
      backgroundColor: colors.surfaceBorder,
      marginVertical: Spacing.md,
      marginHorizontal: Spacing.lg,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      fontSize: FontSize.md,
      fontWeight: "700",
      color: colors.text,
    },
    statValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 2,
    },
    statRank: {
      fontSize: FontSize.xs,
      fontWeight: "600",
      color: colors.primary,
    },
    statLabel: {
      fontSize: FontSize.xs,
      color: colors.textTertiary,
      alignSelf: "stretch",
      textAlign: "center",
    },
    // Section
    section: {
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.lg,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
    },
    sectionTitle: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    // Tags
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.xs,
    },
    tag: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: BorderRadius.xl,
      backgroundColor: colors.surfaceBorder,
    },
    tagText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    // Contest
    contestRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    contestName: {
      flex: 1,
      fontSize: FontSize.md,
      color: colors.text,
    },
    // Rankings
    rankingsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    rankingsInfo: {
      flex: 1,
    },
    rankingsLabel: {
      fontSize: FontSize.md,
      color: colors.text,
    },
    rankingsDesc: {
      fontSize: FontSize.xs,
      color: colors.textTertiary,
      marginTop: 1,
    },
    // Actions
    actions: {
      paddingHorizontal: Spacing.lg,
      marginTop: Spacing.lg,
    },
    actionRow: {
      flexDirection: "row",
      gap: Spacing.md,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 48,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      gap: Spacing.sm,
    },
    actionBtnActive: {
      backgroundColor: colors.primary,
    },
    actionBtnText: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.primary,
    },
    actionBtnTextActive: {
      color: "#fff",
    },
    // Meta
    metaSection: {
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    // similarWrap: { // 相似推荐(已注释)
    //   marginHorizontal: Spacing.lg,
    //   marginTop: Spacing.lg,
    //   marginBottom: Spacing.xl,
    // },
    // similarTitle: {
    //   fontSize: FontSize.md,
    //   fontWeight: "600",
    //   marginBottom: Spacing.sm,
    // },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    metaLabel: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    metaValue: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: colors.text,
      paddingHorizontal: 2,
    },
    metaLink: {
      fontSize: FontSize.sm,
      color: colors.primary,
    },
    bannerRow: {
      marginTop: Spacing.xs,
    },
    bannerLink: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      paddingHorizontal: Spacing.md,
      paddingVertical: 3,
      borderRadius: BorderRadius.xl,
      backgroundColor: colors.surfaceBorder,
    },
    bannerLinkText: {
      fontSize: FontSize.sm,
      color: colors.primary,
      fontWeight: "600",
    },
  });
}
