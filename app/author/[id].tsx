import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { getDatabase } from "../../lib/data/database";
import { formatNumber, statusMapping, genreMapping, statusColors } from "../../utils/mappings";
import { Colors, FontSize, Spacing, BorderRadius } from "../../constants/theme";
import { PageHeader } from "../../components/Header";

interface Author {
  id: number;
  name: string;
  top_novel_title: string | null;
  top_novel_clicks: number;
}

interface Novel {
  id: number;
  title: string;
  author: string | null;
  genre: number;
  status: number;
  click_num: number | null;
}

export default function AuthorDetailScreen() {
  const { id } = useLocalSearchParams();
  const [author, setAuthor] = useState<Author | null>(null);
  const [novels, setNovels] = useState<Novel[]>([]);

  useEffect(() => {
    loadAuthor();
  }, [id]);

  async function loadAuthor() {
    try {
      const db = await getDatabase();

      const authorResult = await db.getFirstAsync<Author>(
        "SELECT id, name, top_novel_title, top_novel_clicks FROM authors WHERE id = ?",
        [Number(id)]
      );
      setAuthor(authorResult);

      if (authorResult) {
        const novelsResult = await db.getAllAsync<Novel>(
          "SELECT id, title, author, genre, status, click_num FROM novels WHERE author = ? ORDER BY click_num DESC",
          [authorResult.name]
        );
        setNovels(novelsResult);
      }
    } catch (error) {
      console.error("Failed to load author:", error);
    }
  }

  if (!author) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title={author.name} />
      <View style={styles.authorInfo}>
        {author.top_novel_title && (
          <Text style={styles.topNovel}>Top: {author.top_novel_title}</Text>
        )}
        <Text style={styles.clicks}>{formatNumber(author.top_novel_clicks)} clicks</Text>
      </View>

      <FlatList
        data={novels}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Novels ({novels.length})</Text>
        }
        renderItem={({ item }) => (
          <Link href={`/novel/${item.id}`} asChild>
            <TouchableOpacity style={styles.novelItem}>
              <View style={styles.novelInfo}>
                <Text style={styles.novelTitle} numberOfLines={1}>
                  {item.title}
                </Text>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  authorInfo: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  topNovel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  clicks: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: "bold",
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    color: Colors.text,
  },
  novelItem: {
    flexDirection: "row",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginBottom: 1,
  },
  novelInfo: {
    flex: 1,
  },
  novelTitle: {
    fontSize: FontSize.md,
    fontWeight: "bold",
    color: Colors.text,
  },
  badges: {
    flexDirection: "row",
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: FontSize.xs,
    color: "#fff",
  },
  novelClicks: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});
