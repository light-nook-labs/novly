import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";
import { Loading, LoadingFooter } from "../components/Loading";
import { BackToTop } from "../components/BackToTop";
import { ICONS } from "../constants/icons";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { type Booklist } from "../types/models";

// SFACG 书单在线接口(离线 DB 无书单数据,需网络拉取)
// 列表页:actionName=/bookList/{id} + expand 返回用户头像/认证/等级等;详情页另用 /bookList/{id}/novel
// 原生端(Android/iOS)fetch 无 CORS 限制;Web/Tauri WebView 若被 CORS 拦截,可将该地址换成代理
const BOOKLIST_API = "https://pages.sfacg.com/api/HttpProxy";
// 列表页 expand 字段(用户资料扩展)
const BOOKLIST_EXPAND = "avatar,verifyType,vipLevel,nickName,growup";
// 开发时二分探测确认 1~1272 全部有效;数量为近似值(sfacg 可能随时间新增),不写死为加载上限
const BOOKLIST_KNOWN_TOTAL = 1272;
const PAGE_SIZE = 10; // 分页大小(每批拉取的书单数)
const CONCURRENCY = 8; // 并发请求数

/** 规整文本:合并连续换行为单个换行(禁止空行,避免破坏布局层次),去除首尾空白 */
function cleanText(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** 每段首行缩进2个全角空格(中文排版习惯),空行不缩进 */
function indentParagraphs(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .split("\n")
    .map((line) => (line.trim() ? "\u3000\u3000" + line : line))
    .join("\n");
}

async function fetchBooklist(id: number): Promise<Booklist | null> {
  try {
    const url = `${BOOKLIST_API}?actionName=${encodeURIComponent(`/bookList/${id}`)}&expand=${encodeURIComponent(BOOKLIST_EXPAND)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.data;
    if (!d || !d.bookListID) return null;
    return {
      bookListID: d.bookListID,
      title: cleanText(d.title) || `书单 #${id}`,
      summary: indentParagraphs(cleanText(d.summary)),
      markNum: d.markNum ?? 0,
      recommendNum: d.recommendNum ?? 0,
      novelNum: d.novelNum ?? 0,
      nickName: d.user?.nickName ?? "",
      avatar: d.user?.expand?.avatar ?? null,
      vipLevel: d.user?.expand?.vipLevel ?? 0,
      lastUpdate: d.lastUpdateDateTime ? String(d.lastUpdateDateTime).slice(0, 10) : null,
    };
  } catch {
    return null;
  }
}

/** 并发受限地拉取一批 id(请求失败/无效 id 返回 null,直接丢弃) */
async function fetchBatch(ids: number[]): Promise<Booklist[]> {
  const results: (Booklist | null)[] = new Array(ids.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const idx = next++;
      results[idx] = await fetchBooklist(ids[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
  return results.filter((b): b is Booklist => b !== null);
}

export default function BooklistsScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const isWide = winWidth >= 1024;
  const [booklists, setBooklists] = useState<Booklist[]>([]);
  const [nextId, setNextId] = useState(1); // 下一个待拉取的 id
  const [startId, setStartId] = useState(1); // 列表起始 id(search/回到#1 重置)
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false); // 探测到最后一个有效书单(某页全空时置位)
  const loadingRef = useRef(false);
  const [idQuery, setIdQuery] = useState("");
  const { scrollRef, showButton, onScroll, scrollToTop } = useScrollToTop();

  // 特殊 search:只允许输入正整数(过滤非数字与前导零),提交后列表从该 id 开始展示
  const handleIdInput = (v: string) => {
    setIdQuery(v.replace(/[^0-9]/g, "").replace(/^0+/, ""));
  };

  // 从指定 id 重新加载列表(重置分页状态,内容区重新渲染)
  const reloadFrom = useCallback(async (start: number) => {
    setStartId(start);
    setBooklists([]);
    setNextId(start);
    setDone(false);
    setError(null);
    setLoadingMore(true);
    try {
      const ids: number[] = [];
      for (let i = start; i < start + PAGE_SIZE; i++) ids.push(i);
      const items = await fetchBatch(ids);
      if (items.length === 0 && start === 1) {
        // 从 #1 首屏拉空:网络/CORS 受限(不置 done,可重试)
        setError("书单数据来自 SFACG 在线接口,当前网络无法访问");
        return;
      }
      setBooklists(items);
      setNextId(start + ids.length);
      if (items.length < PAGE_SIZE) {
        // 不足一页:已到最后一个有效书单(最后一页)
        setDone(true);
      }
    } finally {
      setLoadingMore(false);
    }
  }, []);

  const searchFromId = () => {
    const n = Number(idQuery);
    if (Number.isInteger(n) && n > 0) {
      reloadFrom(n);
      setIdQuery("");
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),

          backgroundColor: colors.background,
        },
        list: {
          // 顶层容器手机端不留 padding(节省空间),卡片贴边展示;web 端由 container 的 padding 提供留白
          paddingBottom: Spacing.xl,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: Spacing.md,
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          backgroundColor: colors.surface,
          // 与 NovelRow 一致:item 之间不留间距,用 1px 背景缝分隔
          marginBottom: 1,
        },
        // 行内 id 前缀(#id),与标题同行,primary 色强调(颜色在 JSX 内联)
        idText: {
          fontSize: FontSize.md,
          fontWeight: "700",
        },
        info: {
          flex: 1,
        },
        title: {
          fontSize: FontSize.md,
          fontWeight: "600",
          color: colors.text,
        },
        summary: {
          fontSize: FontSize.sm,
          color: colors.textSecondary,
          marginTop: 2,
          lineHeight: 18,
        },
        meta: {
          flexDirection: "row",
          alignItems: "center",
          gap: Spacing.md,
          marginTop: Spacing.xs,
          flexWrap: "wrap",
        },
        metaText: {
          fontSize: FontSize.xs,
          color: colors.textTertiary,
        },
        avatar: {
          width: 20,
          height: 20,
          borderRadius: 10,
        },
        updateText: {
          fontSize: FontSize.xs,
          color: colors.textTertiary,
          marginTop: 2,
          paddingHorizontal: 2,
        },
        idSearch: {
          flexDirection: "row",
          alignItems: "center",
          gap: Spacing.xs,
          paddingHorizontal: Spacing.sm,
          height: 36,
          borderRadius: BorderRadius.sm,
        },
        idSearchInput: {
          width: 76,
          padding: 0,
          fontSize: FontSize.md,
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
        loadMoreBtn: {
          alignItems: "center",
          paddingVertical: Spacing.lg,
        },
        backToOneBtn: {
          paddingVertical: Spacing.lg,
        },
        loadMoreText: {
          fontSize: FontSize.md,
          fontWeight: "600",
        },
      }),
    [colors],
  );

  const fetchNext = useCallback(async () => {
    if (loadingRef.current || done) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const ids: number[] = [];
      for (let i = nextId; i < nextId + PAGE_SIZE; i++) ids.push(i);
      const items = await fetchBatch(ids);
      if (items.length === 0 && nextId === startId && startId === 1) {
        // 首批一条都拉不到:网络/CORS 受限(不置 done,可重试)
        setError("书单数据来自 SFACG 在线接口,当前网络无法访问");
        return;
      }
      setError(null);
      setBooklists((prev) => [...prev, ...items]);
      setNextId((prev) => prev + ids.length);
      if (items.length < PAGE_SIZE) {
        // 不足一页:已到最后一个有效书单(最后一页),后续无需再加载
        setDone(true);
      }
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [nextId, done, startId]);

  // 仅首次进入拉第一页;后续页只由底部"加载更多"按钮手动触发,不自动加载
  useEffect(() => {
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = booklists.length;
  // 最新页面的起始 id(最近一次加载页的首个 id),header 显示 起始id/~1272
  const pageStart = Math.max(startId, nextId - PAGE_SIZE);

  return (
    <View style={styles.container}>
      <PageHeader
        title="书单"
        titleAppend={done ? `${pageStart}/${total}` : `${pageStart}/~${BOOKLIST_KNOWN_TOTAL}`}
        right={
          <View style={[styles.idSearch, { backgroundColor: colors.surfaceBorder }]}>
            <Ionicons name={ICONS.search} size={16} color={colors.textTertiary} />
            <TextInput
              style={[styles.idSearchInput, { color: colors.text }]}
              placeholder="书单ID"
              placeholderTextColor={colors.textTertiary}
              value={idQuery}
              onChangeText={handleIdInput}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={searchFromId}
            />
          </View>
        }
      />

      <FlatList
        ref={scrollRef}
        data={booklists}
        keyExtractor={(item) => item.bookListID.toString()}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          error ? (
            <View style={styles.errorWrap}>
              <Ionicons name={ICONS.wifi} size={36} color={colors.textMuted} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={() => reloadFrom(startId)}
              >
                <Text style={styles.retryText}>重试</Text>
              </TouchableOpacity>
            </View>
          ) : done && booklists.length === 0 ? (
            <View style={styles.errorWrap}>
              <Ionicons name={ICONS.booklist} size={36} color={colors.textMuted} />
              <Text style={styles.errorText}>该 ID 之后没有书单</Text>
            </View>
          ) : !loadingMore && booklists.length === 0 ? (
            <Loading />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <LoadingFooter />
          ) : (
            <View style={styles.footerArea}>
              {done && <Text style={styles.endText}>已是最后一页</Text>}
              <View style={styles.footerBtns}>
                <TouchableOpacity style={styles.backToOneBtn} onPress={() => reloadFrom(1)} activeOpacity={0.7}>
                  <Text style={[styles.loadMoreText, { color: colors.textSecondary }]}>回到 #1</Text>
                </TouchableOpacity>
                {!done && (
                  <TouchableOpacity style={styles.loadMoreBtn} onPress={() => fetchNext()} activeOpacity={0.7}>
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>加载更多</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/booklists/${item.bookListID}`)}
            activeOpacity={0.7}
          >
            <View style={styles.info}>
              <Text style={styles.title}>
                <Text style={[styles.idText, { color: colors.primary }]}>#{item.bookListID} </Text>
                {item.title}
              </Text>
              {item.summary ? <Text style={styles.summary}>{item.summary}</Text> : null}
              <View style={styles.meta}>
                {item.avatar ? (
                  <Image
                    source={{ uri: item.avatar }}
                    style={[styles.avatar, { backgroundColor: colors.surfaceBorder }]}
                  />
                ) : null}
                {item.nickName ? <Text style={styles.metaText}>{item.nickName}</Text> : null}
                {item.vipLevel > 0 ? (
                  <Text style={[styles.metaText, { color: colors.primary, fontWeight: "600" }]}>VIP</Text>
                ) : null}
                <Text style={styles.metaText}>{item.novelNum} 部作品</Text>
                <Text style={styles.metaText}>{formatNum(item.markNum)} 收藏</Text>
                {item.recommendNum > 0 && <Text style={styles.metaText}>{formatNum(item.recommendNum)} 推荐</Text>}
              </View>
              {item.lastUpdate ? <Text style={styles.updateText}>更新于 {item.lastUpdate}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
      />

      {showButton && <BackToTop onPress={scrollToTop} />}
    </View>
  );
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}
