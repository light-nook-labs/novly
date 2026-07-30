import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Link, router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "../lib/data/database";
import { formatNumber } from "../utils/mappings";

interface Novel {
  id: number;
  title: string;
  author: string | null;
  click_num: number | null;
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Novel[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const search = useCallback(async (searchQuery: string, reset = false) => {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setResults([]);
      setPage(0);
      setHasMore(true);
      return;
    }

    try {
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;
      const numericId = Number.parseInt(trimmed, 10);
      const idQuery = Number.isNaN(numericId) ? -1 : numericId;

      const results = await db.getAllAsync<Novel>(
        `SELECT id, title, author, click_num
         FROM novels
         WHERE title LIKE ?
            OR author LIKE ?
            OR id = ?
         ORDER BY click_num DESC
         LIMIT ? OFFSET ?`,
        [`%${trimmed}%`, `%${trimmed}%`, idQuery, PAGE_SIZE, offset]
      );

      if (reset) {
        setResults(results);
        setPage(1);
      } else {
        setResults((prev) => [...prev, ...results]);
        setPage((prev) => prev + 1);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error("Search failed:", error);
    }
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="搜索标题、作者或小说 ID..."
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>取消</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Link href={`/novel/${item.id}`} asChild>
            <TouchableOpacity style={styles.resultItem}>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={2}>
                  {item.title} #{item.id}
                </Text>
                <Text style={styles.resultAuthor}>{item.author}</Text>
              </View>
              <Text style={styles.resultClicks}>{formatNumber(item.click_num)}</Text>
            </TouchableOpacity>
          </Link>
        )}
        onEndReached={() => {
          if (hasMore) search(query, false);
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          query ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>未找到匹配结果</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  cancel: {
    marginLeft: 12,
    fontSize: 14,
    color: "#2196F3",
  },
  resultItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 20,
  },
  resultAuthor: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  resultClicks: {
    fontSize: 12,
    color: "#999",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
});
