import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Link } from "expo-router";
import { useState, useEffect } from "react";
import { getDatabase } from "../lib/data/database";

interface Tag {
  id: number;
  name: string;
  novel_count: number;
}

export default function TagsScreen() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  useEffect(() => {
    loadTags(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTags(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function loadTags(reset = false) {
    try {
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;

      let sql = `
        SELECT t.id, t.name, COUNT(nt.novel_id) as novel_count
        FROM tags t
        LEFT JOIN novel_tags nt ON t.id = nt.tag_id
      `;
      const params: any[] = [];

      if (query) {
        sql += " WHERE t.name LIKE ?";
        params.push(`%${query}%`);
      }

      sql += " GROUP BY t.id ORDER BY novel_count DESC LIMIT ? OFFSET ?";
      params.push(PAGE_SIZE, offset);

      const results = await db.getAllAsync<Tag>(sql, params);

      if (reset) {
        setTags(results);
        setPage(1);
      } else {
        setTags((prev) => [...prev, ...results]);
        setPage((prev) => prev + 1);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search tags..."
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        data={tags}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        renderItem={({ item }) => (
          <Link href={`/tag/${item.id}`} asChild>
            <TouchableOpacity style={styles.tagItem}>
              <Text style={styles.tagName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.tagCount}>{item.novel_count}</Text>
            </TouchableOpacity>
          </Link>
        )}
        onEndReached={() => {
          if (hasMore) loadTags(false);
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#ddd",
    margin: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  tagItem: {
    flex: 1,
    margin: 4,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    alignItems: "center",
    maxWidth: "33%",
  },
  tagName: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  tagCount: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
  },
});
