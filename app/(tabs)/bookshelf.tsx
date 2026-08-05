import { FilterState } from "../../types/models";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  getBookshelf,
  removeFromBookshelf as removeFromBookshelfDb,
  type BookshelfNovel,
} from "../../utils/bookshelfDb";
import { TabHeader } from "../../components/TabHeader";
import { Cover } from "../../components/Cover";
import { NovelFilterSheet } from "../../components/NovelFilterSheet";
import { Colors, FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { useTheme } from "../../components/ThemeProvider";

const DEFAULT_FILTER: FilterState = {
  genre: null,
  status: null,
  year: null,
  minWordNum: null,
  maxWordNum: null,
  sortBy: "added_at", // 默认按加入书架时间排序
  descending: true,
};

const SORT_WHITELIST = new Set(["added_at", "click_num", "word_num", "like_num", "praise_num", "last_update"]);

const NUM_COLUMNS = 3;

export default function BookshelfScreen() {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  // 封面固定高度,宽度按 3:4 比例自适应(容器尺寸可控)
  const coverHeight = 154;
  const itemWidth = Math.round(coverHeight * 0.75);
  const [novels, setNovels] = useState<BookshelfNovel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER);
  const [filterVisible, setFilterVisible] = useState(false);

  // 书架范围内的搜索 + 过滤 + 排序（内存操作，数据量小）
  const filteredNovels = useMemo(() => {
    let list = novels;

    // 搜索：标题/作者
    const kw = query.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (n) => n.title.toLowerCase().includes(kw) || (n.author && n.author.toLowerCase().includes(kw)),
      );
    }

    // 过滤：分类/状态/年份/字数
    if (filters.genre !== null) {
      list = list.filter((n) => n.genre === filters.genre);
    }
    if (filters.status !== null) {
      list = list.filter((n) => n.status === filters.status);
    }
    if (filters.year !== null) {
      list = list.filter((n) => n.last_update?.startsWith(String(filters.year)));
    }
    if (filters.minWordNum !== null) {
      list = list.filter((n) => n.word_num != null && n.word_num >= filters.minWordNum!);
    }
    if (filters.maxWordNum !== null) {
      list = list.filter((n) => n.word_num != null && n.word_num < filters.maxWordNum!);
    }

    // 排序
    const sortKey = SORT_WHITELIST.has(filters.sortBy) ? filters.sortBy : "added_at";
    const dir = filters.descending ? -1 : 1;
    list = [...list].sort((a, b) => {
      const va = (a as any)[sortKey] ?? 0;
      const vb = (b as any)[sortKey] ?? 0;
      if (sortKey === "last_update" || sortKey === "added_at") {
        return dir * String(vb).localeCompare(String(va));
      }
      return dir * ((va as number) - (vb as number));
    });

    return list;
  }, [novels, query, filters]);

  const hasActiveFilters =
    filters.genre !== null ||
    filters.status !== null ||
    filters.year !== null ||
    filters.minWordNum !== null ||
    filters.maxWordNum !== null ||
    filters.sortBy !== "click_num" ||
    !filters.descending;

  useFocusEffect(
    useCallback(() => {
      loadBookshelf();
    }, []),
  );

  async function loadBookshelf() {
    try {
      const results = await getBookshelf();
      setNovels(results);
    } catch (error) {
      console.error("Failed to load bookshelf:", error);
    } finally {
      setLoaded(true);
    }
  }

  function removeFromBookshelf(id: number) {
    if (Platform.OS === "web") {
      // RN Web 的 Alert 不支持多按钮确认，用浏览器原生 confirm
      if (window.confirm("从书架移除这部作品？")) {
        doRemove(id);
      }
      return;
    }
    Alert.alert("移除", "从书架移除这部作品？", [
      { text: "取消", style: "cancel" },
      { text: "移除", style: "destructive", onPress: () => doRemove(id) },
    ]);
  }

  async function doRemove(id: number) {
    try {
      await removeFromBookshelfDb(id);
      setNovels((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Failed to remove from bookshelf:", error);
    }
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <TabHeader
        search={query}
        setSearch={setQuery}
        right={
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
            <Ionicons
              name="options-outline"
              size={22}
              color={hasActiveFilters ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.grid}>
          {filteredNovels.map((item) => (
            <View key={item.id} style={[styles.item, { width: itemWidth }]}>
              <View>
                <Link href={`/novels/${item.id}`} asChild>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Cover cover={item.cover} width={itemWidth} height={coverHeight} borderRadius={BorderRadius.md} />
                  </TouchableOpacity>
                </Link>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeFromBookshelf(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              <Link href={`/novels/${item.id}`} asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          ))}
        </View>
        {loaded && filteredNovels.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>书架空空如也</Text>
            <Text style={styles.emptyHint}>去小说详情页点击「加入书架」收藏作品</Text>
          </View>
        )}
      </ScrollView>

      <NovelFilterSheet
        visible={filterVisible}
        filters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={(f) => {
          setFilters(f);
          setFilterVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    ...(Platform.OS === "web" ? { padding: Spacing.lg } : {}),
  },
  filterBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: Spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  row: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  item: {
    gap: Spacing.xs,
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  empty: {
    alignItems: "center",
    paddingTop: 100,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    alignSelf: "stretch",
    textAlign: "center",
  },
  emptyHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    alignSelf: "stretch",
    textAlign: "center",
  },
});
