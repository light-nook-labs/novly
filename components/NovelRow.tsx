import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ID } from "./ID";
import { StatusBadge, Badge } from "./Badge";
import { Cover } from "./Cover";
import { formatNumber, statusMapping, genreMapping, ptypeMapping } from "../utils/mappings";
import { Colors, FontSize, Spacing, BorderRadius } from "../constants/theme";

export interface NovelRowData {
  id: number;
  title: string;
  author: string | null;
  cover: string | null;
  click_num: number | null;
  word_num?: number | null;
  status: number;
  genre: number;
  ptype: number;
}

interface NovelRowProps {
  novel: NovelRowData;
  rank?: number;
  value?: number | null;
  valueLabel?: string;
}

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export function NovelRow({ novel, rank, value, valueLabel }: NovelRowProps) {
  const isTop3 = rank !== undefined && rank <= 3;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.row}
      onPress={() => router.push(`/novel/${novel.id}`)}
    >
      {rank !== undefined && (
        isTop3 ? (
          <View style={[styles.medal, { backgroundColor: RANK_COLORS[rank - 1] }]}>
            <Text style={styles.medalText}>{rank}</Text>
          </View>
        ) : (
          <Text style={styles.rank}>{rank}</Text>
        )
      )}
      <Cover cover={novel.cover} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{novel.title}<ID id={novel.id} /></Text>
        {novel.author && (
          <Text style={styles.author} numberOfLines={1}>{novel.author}</Text>
        )}
        <View style={styles.badges}>
          <StatusBadge statusId={novel.status} label={statusMapping[novel.status] ?? "其他"} />
          {genreMapping[novel.genre] && (
            <Badge label={genreMapping[novel.genre]} variant="genre" />
          )}
          {ptypeMapping[novel.ptype] && (
            <Badge label={ptypeMapping[novel.ptype]} variant="ptype" />
          )}
        </View>
      </View>
      <View style={styles.valueWrap}>
        {value !== undefined && value !== null && (
          <>
            <Text style={styles.value}>{formatNumber(value)}</Text>
            {valueLabel && <Text style={styles.valueLabel}>{valueLabel}</Text>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
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
    color: Colors.textTertiary,
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
    color: Colors.text,
  },
  id: {
    fontSize: FontSize.md,
    fontWeight: "400",
    fontStyle: "italic",
    color: Colors.textTertiary,
  },
  author: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  badges: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: 2,
    flexWrap: "wrap",
  },
  valueWrap: {
    alignItems: "center",
    minWidth: 48,
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
  },
  valueLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
});
