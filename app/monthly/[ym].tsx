import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../utils/database";
import { NovelRow } from "../../components/NovelRow";
import { PageHeader } from "../../components/Header";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { ICONS } from "../../constants/icons";
import { useTheme } from "../../components/ThemeProvider";
import { BackToTop } from "../../components/BackToTop";
import { Loading } from "../../components/Loading";

// 某月的榜单分类(sfacg MonthlyBoy rank 参数)
// 注意:旧月份可能只有部分分类有数据(如只有月票榜),其余显示"该月暂无此榜单"
const MONTHLY_TABS = [
  { key: "ticket", rank: 0, label: "月票榜", valueLabel: "月票" },
  { key: "newbook", rank: 2, label: "新书榜", valueLabel: "票数" },
  { key: "hotsale", rank: 3, label: "热销榜", valueLabel: "票数" },
  { key: "dialogue", rank: 4, label: "对话月票", valueLabel: "月票" },
];

interface RankNovel {
  id: number;
  title: string;
  author: string | null;
  genre: number;
  status: number;
  ptype: number;
  word_num: number;
  click_num: number;
  like_num: number;
  praise_num: number;
  review_num: number;
  comment_num: number;
  cover: string | null;
  ticket_num: number;
}

export default function MonthlyRankScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { ym } = useLocalSearchParams(); // "202606"
  const ymStr = String(ym ?? "");
  const apiDate = `${ymStr.slice(0, 4)}-${ymStr.slice(4, 6)}`; // "2026-06"
  const [tabIndex, setTabIndex] = useState(0);
  const [novels, setNovels] = useState<RankNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tab = MONTHLY_TABS[tabIndex];
      const res = await fetch(
        `https://pages.sfacg.com/ajax/act/MonthlyBoy.ashx?op=getRanks&date=${apiDate}&rank=${tab.rank}`,
      );
      const json = await res.json();
      const items: any[] = Array.isArray(json?.data) ? json.data : [];

      // 用本地 DB 补充元数据(状态/分类/封面等)
      const db = await getDatabase();
      const ids = items.map((s: any) => Number(s.nid)).filter((n: number) => Number.isInteger(n));
      let rows: {
        id: number;
        title: string;
        author: string | null;
        genre: number;
        status: number;
        ptype: number;
        cover: string | null;
      }[] = [];
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        rows = await db.getAllAsync<{
          id: number;
          title: string;
          author: string | null;
          genre: number;
          status: number;
          ptype: number;
          cover: string | null;
        }>(`SELECT id, title, author, genre, status, ptype, cover FROM novels WHERE id IN (${placeholders})`, ids);
      }
      const rowMap = new Map(rows.map((r) => [r.id, r]));
      setNovels(
        items.map((s: any): RankNovel => {
          const dbRow = rowMap.get(Number(s.nid));
          return {
            id: Number(s.nid),
            title: dbRow?.title ?? s.name ?? "",
            author: dbRow?.author ?? s.authorName ?? null,
            genre: dbRow?.genre ?? 0,
            status: dbRow?.status ?? 0,
            ptype: dbRow?.ptype ?? 0,
            word_num: 0,
            click_num: 0,
            like_num: 0,
            praise_num: 0,
            review_num: 0,
            comment_num: 0,
            cover: dbRow?.cover ?? s.cover ?? null,
            ticket_num: s.ticketNum ?? 0,
          };
        }),
      );
    } catch {
      setError("月榜数据来自 SFACG 在线接口,当前网络无法访问");
    } finally {
      setLoading(false);
    }
  }, [tabIndex, apiDate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <PageHeader
        title="月榜"
        titleAppend={ymStr.length === 6 ? `${ymStr.slice(0, 4)}年${Number(ymStr.slice(4, 6))}月` : ymStr}
      />

      {/* 榜单分类 head tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {MONTHLY_TABS.map((tab, index) => {
            const active = tabIndex === index;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setTabIndex(index)}
              >
                <Ionicons name={ICONS.wifi} size={14} color={active ? "#fff" : colors.textSecondary} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <Loading />
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name={ICONS.wifi} size={36} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={load}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : novels.length === 0 ? (
        // 旧月份可能只有部分分类有榜单(如仅月票榜)
        <View style={styles.errorWrap}>
          <Ionicons name={ICONS.booklist} size={36} color={colors.textMuted} />
          <Text style={styles.errorText}>该月暂无此榜单</Text>
        </View>
      ) : (
        <FlatList
          ref={scrollRef}
          data={novels}
          keyExtractor={(item) => item.id.toString()}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={{ paddingBottom: 16 }}>
              <NovelRow
                novel={item}
                rank={index + 1}
                value={item.ticket_num}
                valueLabel={MONTHLY_TABS[tabIndex].valueLabel}
              />
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
    tabBar: {
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.surfaceBorder,
    },
    tabScroll: {
      paddingHorizontal: Spacing.md,
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: 20,
      gap: 4,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: "#fff",
      fontWeight: "600",
    },
    list: {
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
    },
    errorWrap: {
      alignItems: "center",
      paddingVertical: Spacing.xl * 2,
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    errorText: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
      textAlign: "center",
    },
    retryBtn: {
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.primary,
    },
    retryText: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: "#fff",
    },
  });
}
