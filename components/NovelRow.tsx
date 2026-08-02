import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { memo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ID } from "./ID";
import { StatusBadge, Badge } from "./Badge";
import { Cover } from "./Cover";
import { formatNumber, statusMapping, genreMapping, ptypeMapping } from "../utils/mappings";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

export interface NovelRowData {
  id: number;
  title: string;
  author: string | null;
  cover: string | null;
  click_num: number | null;
  word_num?: number | null;
  like_num?: number | null;
  comment_num?: number | null;
  tags?: string[];
  status: number;
  genre: number;
  ptype: number;
}

interface NovelRowProps {
  novel: NovelRowData;
  rank?: number;
  value?: number | null;
  valueLabel?: string;
  extended?: boolean;
}

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export const NovelRow = memo(function NovelRow({ novel, rank, value, valueLabel, extended }: NovelRowProps) {
  const { colors } = useTheme();
  const isTop3 = rank !== undefined && rank <= 3;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.row, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/novel/${novel.id}`)}
    >
      {rank !== undefined &&
        (isTop3 ? (
          <View style={[styles.medal, { backgroundColor: RANK_COLORS[rank - 1] }]}>
            <Text style={styles.medalText}>{rank}</Text>
          </View>
        ) : (
          <Text style={[styles.rank, { color: colors.textTertiary }]}>{rank}</Text>
        ))}
      <Cover cover={novel.cover} width={68} height={90} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {novel.title}
          <ID id={novel.id} weight="600" />
        </Text>
        {novel.author && (
          <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>
            {novel.author}
          </Text>
        )}
        <View style={styles.badges}>
          <StatusBadge statusId={novel.status} label={statusMapping[novel.status] ?? "其他"} />
          {genreMapping[novel.genre] && <Badge label={genreMapping[novel.genre]} variant="genre" />}
          {ptypeMapping[novel.ptype] && <Badge label={ptypeMapping[novel.ptype]} variant="ptype" />}
        </View>
        {extended && (
          <View style={styles.extendedStats}>
            {novel.like_num != null && novel.like_num > 0 && (
              <View style={styles.extStat}>
                <Ionicons name="heart-outline" size={12} color={colors.textTertiary} />
                <Text style={[styles.extStatText, { color: colors.textTertiary }]}>{formatNumber(novel.like_num)}</Text>
              </View>
            )}
            {novel.word_num != null && novel.word_num > 0 && (
              <View style={styles.extStat}>
                <Ionicons name="document-text-outline" size={12} color={colors.textTertiary} />
                <Text style={[styles.extStatText, { color: colors.textTertiary }]}>
                  {formatNumber(novel.word_num)}字
                </Text>
              </View>
            )}
            {novel.comment_num != null && novel.comment_num > 0 && (
              <View style={styles.extStat}>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textTertiary} />
                <Text style={[styles.extStatText, { color: colors.textTertiary }]}>
                  {formatNumber(novel.comment_num)}
                </Text>
              </View>
            )}
          </View>
        )}
        {extended && novel.tags && novel.tags.length > 0 && (
          <View style={styles.tagRow}>
            {novel.tags.slice(0, 4).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.surfaceBorder }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
              </View>
            ))}
            {novel.tags.length > 4 && (
              <Text style={[styles.tagMore, { color: colors.textTertiary }]}>+{novel.tags.length - 4}</Text>
            )}
          </View>
        )}
      </View>
      <View style={styles.valueWrap}>
        {value !== undefined && value !== null && (
          <>
            <Text style={[styles.value, { color: colors.primary }]}>{formatNumber(value)}</Text>
            {valueLabel && <Text style={[styles.valueLabel, { color: colors.textTertiary }]}>{valueLabel}</Text>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flex: 1, // web 多列 grid 时均分列宽
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: 1,
    gap: Spacing.md,
  },
  rankWrap: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  rank: {
    width: 32,
    fontSize: FontSize.md,
    fontWeight: "700",
    textAlign: "center",
  },
  medal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  id: {
    fontSize: FontSize.md,
    fontWeight: "400",
    fontStyle: "italic",
  },
  author: {
    fontSize: FontSize.sm,
  },
  badges: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: 2,
    flexWrap: "wrap",
  },
  extendedStats: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    gap: Spacing.md,
    flexWrap: "wrap",
  },
  extStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  extStatText: {
    fontSize: FontSize.xs,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagText: {
    fontSize: FontSize.xs - 1,
  },
  tagMore: {
    fontSize: FontSize.xs - 1,
    alignSelf: "center",
  },
  valueWrap: {
    alignItems: "center",
    minWidth: 48,
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  valueLabel: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
});
