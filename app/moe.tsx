// 萌神大赛:展示所有 20xx萌神 标签的小说(按年份分组,每年2本)
import { View, FlatList, Text, StyleSheet, Platform } from "react-native";
import { useState, useEffect, useMemo, useCallback } from "react";
import { getDatabase } from "../utils/database";
import { NovelRow, type NovelRowData } from "../components/NovelRow";
import { PageHeader } from "../components/Header";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { FontSize, Spacing } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { BackToTop } from "../components/BackToTop";
import { Loading } from "../components/Loading";
import { groupMoeByYear, type MoeGroup } from "../utils/moe";

export default function MoeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [groups, setGroups] = useState<MoeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<NovelRowData & { tag_name: string }>(
        `SELECT DISTINCT n.id, n.title, n.author, n.cover, n.click_num, n.status, n.genre, n.ptype, t.name as tag_name
         FROM novels n
         INNER JOIN novel_tags nt ON n.id = nt.novel_id
         INNER JOIN tags t ON nt.tag_id = t.id
         WHERE t.name LIKE '%萌神'
         ORDER BY t.name DESC, n.click_num DESC`,
      );
      setGroups(groupMoeByYear(rows));
    } catch (error) {
      console.error("Failed to load moe:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时加载数据,内部 setState 为加载流程
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <PageHeader title="萌神大赛" />

      {loading ? (
        <Loading />
      ) : groups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无萌神大赛数据</Text>
        </View>
      ) : (
        <FlatList
          ref={scrollRef}
          data={groups}
          keyExtractor={(g) => g.year}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 16 }}>
              <View style={styles.yearHeader}>
                <Text style={[styles.yearText, { color: colors.textSecondary }]}>{item.year}</Text>
              </View>
              {item.novels.map((novel) => (
                <NovelRow key={novel.id} novel={novel} unordered value={novel.click_num} valueLabel="点击" />
              ))}
            </View>
          )}
        />
      )}

      {showButton && <BackToTop onPress={scrollToTop} />}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

      backgroundColor: colors.background,
    },
    list: {
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
    },
    yearHeader: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    yearText: {
      fontSize: FontSize.md,
      fontWeight: "600",
    },
    emptyWrap: {
      alignItems: "center",
      paddingVertical: Spacing.xl * 2,
    },
    emptyText: {
      fontSize: FontSize.md,
    },
  });
}
