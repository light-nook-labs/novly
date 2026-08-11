import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";
import { PageHeader } from "../../components/Header";
import { Loading } from "../../components/Loading";
import { BackToTop } from "../../components/BackToTop";
import { Cover } from "../../components/Cover";
import { ICONS } from "../../constants/icons";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type CacheEntry, type BooklistMeta, type BooklistNovel } from "../../types/models";
import { parseBooklistMeta, parseBooklistNovels, BOOKLIST_CACHE_TTL, BOOKLIST_API } from "../../utils/booklistApi";

// SFACG 书单在线接口(详情页:actionName=/bookList/{id}/novel 返回书单内小说列表)
// 原生端 fetch 无 CORS 限制;Web/Tauri WebView 被 CORS 拦截时可将该地址换成代理
// 详情页 expand(小说大封面/类型名/简介字数/标签等)
const DETAIL_EXPAND = "bigNovelCover,typeName,intropointCount,tags,sysTags";
// 书单元数据 expand(用户头像/认证/等级等)
const META_EXPAND = "avatar,verifyType,vipLevel,nickName,growup";

/** 规整文本:合并连续换行为单个换行(禁止空行),去除首尾空白 */
function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}

export default function BooklistDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams();
  const bookListId = Number(id);
  const [meta, setMeta] = useState<BooklistMeta | null>(null);
  const [novels, setNovels] = useState<BooklistNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cacheKey = `booklist_detail_${bookListId}`;

      // 本地缓存(24h TTL):命中则跳过在线请求
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const entry: CacheEntry<{ meta: BooklistMeta | null; novels: BooklistNovel[] }> = JSON.parse(cached);
        if (Date.now() - entry.timestamp < BOOKLIST_CACHE_TTL) {
          if (entry.data.meta) setMeta(entry.data.meta);
          setNovels(entry.data.novels);
          return;
        }
      }

      const metaUrl = `${BOOKLIST_API}?actionName=${encodeURIComponent(`/bookList/${bookListId}`)}&expand=${encodeURIComponent(META_EXPAND)}`;
      const detailUrl = `${BOOKLIST_API}?actionName=${encodeURIComponent(`/bookList/${bookListId}/novel`)}&expand=${encodeURIComponent(DETAIL_EXPAND)}`;
      const [metaRes, detailRes] = await Promise.all([fetch(metaUrl), fetch(detailUrl)]);
      const metaJson = await metaRes.json();
      const detailJson = await detailRes.json();

      const meta = parseBooklistMeta(metaJson, bookListId);
      if (meta) {
        setMeta(meta);
      }

      const novels = parseBooklistNovels(detailJson);
      setNovels(novels);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: { meta, novels } }));
    } catch {
      setError("书单数据来自 SFACG 在线接口,当前网络无法访问");
    } finally {
      setLoading(false);
    }
  }, [bookListId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时加载数据,内部 setState 为加载流程
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <PageHeader title="书单" titleAppend={Number.isNaN(bookListId) ? undefined : `#${bookListId}`} />

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
      ) : (
        <FlatList
          ref={scrollRef}
          data={novels}
          keyExtractor={(item) => item.novelId.toString()}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            meta ? (
              <View style={styles.headerCard}>
                <Text style={styles.headerTitle}>
                  <Text style={[styles.idText, { color: colors.primary }]}>#{meta.bookListID} </Text>
                  {meta.title}
                </Text>
                {meta.summary ? <Text style={styles.headerSummary}>{meta.summary}</Text> : null}
                <View style={styles.metaRow}>
                  {meta.nickName ? <Text style={styles.metaText}>{meta.nickName}</Text> : null}
                  <Text style={styles.metaText}>{meta.novelNum} 部作品</Text>
                  <Text style={styles.metaText}>{formatNum(meta.markNum)} 收藏</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            novels.length === 0 ? (
              <View style={styles.errorWrap}>
                <Ionicons name={ICONS.booklist} size={36} color={colors.textMuted} />
                <Text style={styles.errorText}>暂无作品</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/novels/${item.novelId}`)}
              activeOpacity={0.7}
            >
              {/* 信息在上(封面+标题/作者/数据),介绍在下(全宽),长文本不会挤压头部 */}
              <View style={styles.itemHeader}>
                <Cover cover={item.novelCover} width={68} height={90} />
                <View style={styles.info}>
                  <Text style={styles.title}>{item.novelName}</Text>
                  {item.authorName ? <Text style={styles.author}>{item.authorName}</Text> : null}
                  <View style={styles.metaRow}>
                    {item.charCount > 0 && <Text style={styles.metaText}>{formatNum(item.charCount)} 字</Text>}
                    {item.markCount > 0 && <Text style={styles.metaText}>{formatNum(item.markCount)} 收藏</Text>}
                    {item.viewTimes > 0 && <Text style={styles.metaText}>{formatNum(item.viewTimes)} 点击</Text>}
                  </View>
                  {(item.typeName || item.sysTags.length > 0 || item.tags.length > 0) && (
                    <View style={styles.tagRow}>
                      {item.typeName ? (
                        <View style={[styles.tag, { backgroundColor: colors.primary + "15" }]}>
                          <Text style={[styles.tagText, { color: colors.primary }]}>{item.typeName}</Text>
                        </View>
                      ) : null}
                      {[...new Set([...item.sysTags, ...item.tags])].map((tag) => (
                        <View key={tag} style={[styles.tag, { backgroundColor: colors.surfaceBorder }]}>
                          <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
            </TouchableOpacity>
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
      // 顶层容器手机端不留 padding,内容贴边;web 端由 container 的 padding 提供留白
      paddingBottom: Spacing.xl,
    },
    headerCard: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: colors.surface,
      marginBottom: 1,
    },
    headerTitle: {
      fontSize: FontSize.lg,
      fontWeight: "600",
      color: colors.text,
      lineHeight: 24,
    },
    idText: {
      fontSize: FontSize.lg,
      fontWeight: "700",
    },
    headerSummary: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginTop: Spacing.sm,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      marginTop: Spacing.xs,
      flexWrap: "wrap",
    },
    metaText: {
      fontSize: FontSize.xs,
      fontWeight: "600",
      color: colors.textTertiary,
      paddingHorizontal: 2,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
      marginTop: Spacing.xs,
    },
    tag: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    tagText: {
      fontSize: FontSize.xs - 1,
      fontWeight: "600",
    },
    row: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: colors.surface,
      // 与列表页一致:item 之间不留间距,用 1px 背景缝分隔
      marginBottom: 1,
    },
    itemHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.md,
    },
    info: {
      flex: 1,
      gap: 3,
    },
    title: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    author: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    note: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      lineHeight: 20,
      marginTop: Spacing.sm,
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
