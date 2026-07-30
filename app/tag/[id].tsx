import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { getDatabase } from "../../lib/data/database";
import { formatNumber, statusMapping, genreMapping, statusColors } from "../../utils/mappings";

interface Tag {
  id: number;
  name: string;
}

interface Novel {
  id: number;
  title: string;
  author: string | null;
  genre: number;
  status: number;
  click_num: number | null;
}

export default function TagDetailScreen() {
  const { id } = useLocalSearchParams();
  const [tag, setTag] = useState<Tag | null>(null);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadTag();
  }, [id]);

  async function loadTag() {
    try {
      const db = await getDatabase();

      const tagResult = await db.getFirstAsync<Tag>(
        "SELECT id, name FROM tags WHERE id = ?",
        [Number(id)]
      );
      setTag(tagResult);

      if (tagResult) {
        loadNovels(true);
      }
    } catch (error) {
      console.error("Failed to load tag:", error);
    }
  }

  async function loadNovels(reset = false) {
    try {
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;

      const results = await db.getAllAsync<Novel>(
        `SELECT n.id, n.title, n.author, n.genre, n.status, n.click_num
         FROM novels n
         INNER JOIN novel_tags nt ON n.id = nt.novel_id
         WHERE nt.tag_id = ?
         ORDER BY n.click_num DESC
         LIMIT ? OFFSET ?`,
        [Number(id), PAGE_SIZE, offset]
      );

      if (reset) {
        setNovels(results);
        setPage(1);
      } else {
        setNovels((prev) => [...prev, ...results]);
        setPage((prev) => prev + 1);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load novels:", error);
    }
  }

  if (!tag) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{tag.name}</Text>
      </View>

      <FlatList
        data={novels}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Link href={`/novel/${item.id}`} asChild>
            <TouchableOpacity style={styles.novelItem}>
              <View style={styles.novelInfo}>
                <Text style={styles.novelTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.novelAuthor}>{item.author}</Text>
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: statusColors[item.status] || "#999" }]}>
                    <Text style={styles.badgeText}>{statusMapping[item.status]}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: "#666" }]}>
                    <Text style={styles.badgeText}>{genreMapping[item.genre]}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.novelClicks}>{formatNumber(item.click_num)}</Text>
            </TouchableOpacity>
          </Link>
        )}
        onEndReached={() => {
          if (hasMore) loadNovels(false);
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
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
  },
  novelItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  novelInfo: {
    flex: 1,
  },
  novelTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  novelAuthor: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  badges: {
    flexDirection: "row",
    marginTop: 4,
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: "#fff",
  },
  novelClicks: {
    fontSize: 12,
    color: "#999",
  },
});
