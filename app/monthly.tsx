// 月榜:月份列表(从当前月到第一期 2013-03),点击月份进入该月榜单页(monthly/[ym])
import { View, FlatList, Text, TouchableOpacity, TextInput, StyleSheet, Platform } from "react-native";
import { useState, useMemo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PageHeader } from "../components/Header";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { PAGE_SIZE } from "../constants/pagination";
import { ICONS } from "../constants/icons";
import { useTheme } from "../components/ThemeProvider";
import { BackToTop } from "../components/BackToTop";
import { currentYm, generateMonthsFrom, FIRST_MONTH } from "../utils/months";


export default function MonthlyListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [monthQuery, setMonthQuery] = useState("");
  const [monthStart, setMonthStart] = useState(() => currentYm());
  const [monthPage, setMonthPage] = useState(1);
  const allMonths = useMemo(() => generateMonthsFrom(monthStart), [monthStart]);
  const visibleMonths = allMonths.slice(0, monthPage * PAGE_SIZE);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  // 回到最新月(重置起始月与分页)
  const backToLatest = () => {
    setMonthStart(currentYm());
    setMonthPage(1);
  };

  // 搜索:只允许 4~6 位数字,提交后列表从该月起重新分页(yyyy 是 yyyy12 的简写)
  const handleMonthInput = (v: string) => {
    setMonthQuery(v.replace(/[^0-9]/g, "").slice(0, 6));
  };

  const searchMonth = () => {
    const q = monthQuery;
    setMonthQuery("");
    if (!/^\d{4}$/.test(q) && !/^\d{6}$/.test(q)) return;
    const ym = q.length === 4 ? `${q}12` : q; // yyyy 是 yyyy12 的简写
    const first = FIRST_MONTH;
    if (ym <= currentYm() && ym >= first) {
      setMonthStart(ym);
      setMonthPage(1);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="月榜" />

      <View style={[styles.monthSearch, { backgroundColor: colors.surfaceBorder }]}>
        <Ionicons name={ICONS.search} size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.monthSearchInput, { color: colors.text }]}
          placeholder="输入月份,如 202506 或 2025"
          placeholderTextColor={colors.textTertiary}
          value={monthQuery}
          onChangeText={handleMonthInput}
          keyboardType="number-pad"
          returnKeyType="go"
          onSubmitEditing={searchMonth}
        />
      </View>

      <FlatList
        ref={scrollRef}
        data={visibleMonths}
        keyExtractor={(item) => item}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.monthRow}
            onPress={() => router.push(`/monthly/${item}`)}
            activeOpacity={0.7}
          >
            <Text style={[styles.monthText, { color: colors.text }]}>
              {item.slice(0, 4)}年{Number(item.slice(4, 6))}月
            </Text>
            <Ionicons name={ICONS.jump} size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={styles.footerArea}>
            {visibleMonths.length >= allMonths.length && <Text style={styles.endText}>已是最后一期</Text>}
            <View style={styles.footerBtns}>
              <TouchableOpacity style={styles.backToLatestBtn} onPress={backToLatest} activeOpacity={0.7}>
                <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>回到最新</Text>
              </TouchableOpacity>
              {visibleMonths.length < allMonths.length && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setMonthPage((p) => p + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.footerBtnText, { color: colors.primary }]}>加载更多</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
      />

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
      paddingBottom: Spacing.xl,
    },
    monthSearch: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      height: 36,
      borderRadius: BorderRadius.sm,
    },
    monthSearchInput: {
      flex: 1,
      padding: 0,
      fontSize: FontSize.md,
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      backgroundColor: colors.surface,
      marginBottom: 1,
    },
    monthText: {
      fontSize: FontSize.md,
      fontWeight: "600",
    },
    footerArea: {
      alignItems: "center",
      paddingBottom: Spacing.lg,
    },
    endText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: colors.textTertiary,
      paddingVertical: Spacing.md,
    },
    footerBtns: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.xl,
    },
    footerBtnText: {
      fontSize: FontSize.md,
      fontWeight: "600",
    },
    backToLatestBtn: {
      paddingVertical: Spacing.lg,
    },
    loadMoreBtn: {
      alignItems: "center",
      paddingVertical: Spacing.lg,
    },
  });
}
