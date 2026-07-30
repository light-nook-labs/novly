import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { getDatabase } from "../../lib/data/database";
import { formatNumber, statusMapping, genreMapping, statusColors } from "../../utils/mappings";

interface Contest {
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

export default function ContestDetailScreen() {
  const { id } = useLocalSearchParams();
  const [contest, setContest] = useState<Contest | null>(null);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadContest();
  }, [id]);

  async function loadContest() {
    try {
      const db = await getDatabase();

      const contestResult = await db.getFirstAsync<Contest>(
        "SELECT id, name FROM contests WHERE id = ?",
        [Number(id)]
      );
      setContest(contestResult);

      if (contestResult) {
        loadNovels(true);
      }
    } catch (error) {
      console.error("Failed to load contest:", error);
    }
  }

  async function loadNovels(reset = false) {
    try {
      const db = await getDatabase();
      const offset = reset ? 0 : page * PAGE_SIZE;

      const results = await db.getAllAsync<Novel>(
        "SELECT id, title, author, genre, status, click_num FROM novels WHERE contest_id = ? ORDER BY click_num DESC LIMIT ? OFFSET ?",
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

  if (!contest) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{contest.name}</Text>
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
