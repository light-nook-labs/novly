import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Link } from "expo-router";
import { useState, useEffect } from "react";
import { getDatabase } from "../lib/data/database";

interface Contest {
  id: number;
  name: string;
  novel_count: number;
}

export default function ContestsScreen() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    loadContests(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadContests(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function loadContests(reset = false) {
    try {
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;

      let sql = `
        SELECT c.id, c.name, COUNT(n.id) as novel_count
        FROM contests c
        LEFT JOIN novels n ON c.id = n.contest_id
      `;
      const params: any[] = [];

      if (query) {
        sql += " WHERE c.name LIKE ?";
        params.push(`%${query}%`);
      }

      sql += " GROUP BY c.id ORDER BY novel_count DESC LIMIT ? OFFSET ?";
      params.push(PAGE_SIZE, offset);

      const results = await db.getAllAsync<Contest>(sql, params);

      if (reset) {
        setContests(results);
        setPage(1);
      } else {
        setContests((prev) => [...prev, ...results]);
        setPage((prev) => prev + 1);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load contests:", error);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search contests..."
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        data={contests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Link href={`/contest/${item.id}`} asChild>
            <TouchableOpacity style={styles.contestItem}>
              <View style={styles.contestInfo}>
                <Text style={styles.contestName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <Text style={styles.novelCount}>{item.novel_count} novels</Text>
            </TouchableOpacity>
          </Link>
        )}
        onEndReached={() => {
          if (hasMore) loadContests(false);
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
  contestItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  contestInfo: {
    flex: 1,
  },
  contestName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  novelCount: {
    fontSize: 12,
    color: "#999",
  },
});
