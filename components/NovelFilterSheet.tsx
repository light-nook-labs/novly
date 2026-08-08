import { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../utils/database";
import { genreMapping, statusMapping } from "../utils/mappings";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";
import { type FilterState } from "../types/models";

export type { FilterState };

interface NovelFilterSheetProps {
  visible: boolean;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { key: "click_num", label: "点击量" },
  { key: "word_num", label: "字数" },
  { key: "like_num", label: "收藏" },
  { key: "praise_num", label: "点赞" },
  { key: "last_update", label: "更新时间" },
];

const WORD_NUM_RANGES: { label: string; min: number | null; max: number | null }[] = [
  { label: "不限", min: null, max: null },
  { label: "<5万", min: null, max: 50000 },
  { label: "5-10万", min: 50000, max: 100000 },
  { label: "10-20万", min: 100000, max: 200000 },
  { label: "20-50万", min: 200000, max: 500000 },
  { label: "50-100万", min: 500000, max: 1000000 },
  { label: "100-200万", min: 1000000, max: 2000000 },
  { label: "200-500万", min: 2000000, max: 5000000 },
  { label: ">500万", min: 5000000, max: null },
];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: colors.surfaceBorder }, selected && { backgroundColor: colors.primary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[styles.chipText, { color: colors.textSecondary }, selected && { color: "#fff", fontWeight: "600" }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

export function NovelFilterSheet({ visible, filters, onApply, onClose }: NovelFilterSheetProps) {
  const { colors } = useTheme();
  const [genre, setGenre] = useState<number | null>(filters.genre);
  const [status, setStatus] = useState<number | null>(filters.status);
  const [year, setYear] = useState<number | null>(filters.year);
  const [minWordNum, setMinWordNum] = useState<number | null>(filters.minWordNum);
  const [maxWordNum, setMaxWordNum] = useState<number | null>(filters.maxWordNum);
  const [sortBy, setSortBy] = useState<string>(filters.sortBy);
  const [descending, setDescending] = useState<boolean>(filters.descending);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时从 props 同步本地筛选状态(有意为之)
      setGenre(filters.genre);
      setStatus(filters.status);
      setYear(filters.year);
      setMinWordNum(filters.minWordNum);
      setMaxWordNum(filters.maxWordNum);
      setSortBy(filters.sortBy);
      setDescending(filters.descending);
    }
  }, [visible, filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- React Compiler 规则标记既有加载模式,数据更新为有意为之
    loadYears();
  }, []);

  async function loadYears() {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ y: string }>(
        "SELECT DISTINCT SUBSTR(last_update, 1, 4) as y FROM novels WHERE last_update IS NOT NULL ORDER BY y DESC",
      );
      setAvailableYears(rows.map((r) => Number(r.y)).filter((y) => !isNaN(y)));
    } catch (e) {
      console.error("Failed to load years:", e);
    }
  }

  function handleReset() {
    setGenre(null);
    setStatus(null);
    setYear(null);
    setMinWordNum(null);
    setMaxWordNum(null);
    setSortBy("click_num");
    setDescending(true);
  }

  function handleApply() {
    onApply({ genre, status, year, minWordNum, maxWordNum, sortBy, descending });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>筛选与排序</Text>
            <TouchableOpacity onPress={handleReset} activeOpacity={0.7}>
              <Text style={[styles.resetText, { color: colors.primary }]}>重置</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <ScrollView contentContainerStyle={styles.body}>
            <Section title="分类">
              <Chip label="全部" selected={genre === null} onPress={() => setGenre(null)} />
              {Object.entries(genreMapping)
                .filter(([k]) => Number(k) !== 1) // 其他 数据已在生成 db 时删除
                .map(([k, v]) => (
                  <Chip key={k} label={v} selected={genre === Number(k)} onPress={() => setGenre(Number(k))} />
                ))}
            </Section>

            <Section title="状态">
              <Chip label="全部" selected={status === null} onPress={() => setStatus(null)} />
              {Object.entries(statusMapping)
                .filter(([k]) => Number(k) !== 1) // 其他 数据已在生成 db 时删除
                .map(([k, v]) => (
                  <Chip key={k} label={v} selected={status === Number(k)} onPress={() => setStatus(Number(k))} />
                ))}
            </Section>

            <Section title="更新年份">
              <Chip label="全部" selected={year === null} onPress={() => setYear(null)} />
              {availableYears.map((y) => (
                <Chip key={y} label={`${y}年`} selected={year === y} onPress={() => setYear(y)} />
              ))}
            </Section>

            <Section title="字数范围">
              {WORD_NUM_RANGES.map((r) => (
                <Chip
                  key={r.label}
                  label={r.label}
                  selected={minWordNum === r.min && maxWordNum === r.max}
                  onPress={() => {
                    setMinWordNum(r.min);
                    setMaxWordNum(r.max);
                  }}
                />
              ))}
            </Section>

            <Section title="排序">
              <View style={styles.sortRow}>
                <View style={styles.chipRow}>
                  {SORT_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.key}
                      label={opt.label}
                      selected={sortBy === opt.key}
                      onPress={() => setSortBy(opt.key)}
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.orderBtn, { borderColor: colors.primary }]}
                  onPress={() => setDescending((d) => !d)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={descending ? "arrow-down" : "arrow-up"} size={16} color={colors.primary} />
                  <Text style={[styles.orderText, { color: colors.primary }]}>{descending ? "降序" : "升序"}</Text>
                </TouchableOpacity>
              </View>
            </Section>
          </ScrollView>

          {/* Apply */}
          <View style={[styles.footer, { borderTopColor: colors.surfaceBorder }]}>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Text style={styles.applyText}>应用</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  resetText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  sortRow: {
    gap: Spacing.sm,
  },
  orderBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  orderText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  applyBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  applyText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#fff",
    alignSelf: "stretch",
    textAlign: "center",
  },
});
