import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDatabase } from "../../lib/data/database";
import { formatNumber, statusMapping, genreMapping, ptypeMapping, statusColors } from "../../utils/mappings";

interface Novel {
  id: number;
  title: string;
  author: string | null;
  genre: number;
  status: number;
  ptype: number;
  has_banner: number;
  word_num: number | null;
  click_num: number | null;
  praise_num: number | null;
  like_num: number | null;
  comment_num: number | null;
  review_num: number | null;
  cover: string | null;
  last_update: string | null;
}

const BOOKSHELF_KEY = "bookshelf";

export default function NovelDetailScreen() {
  const { id } = useLocalSearchParams();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [isInBookshelf, setIsInBookshelf] = useState(false);

  useEffect(() => {
    loadNovel();
    checkBookshelf();
  }, [id]);

  async function loadNovel() {
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync<Novel>(
        "SELECT * FROM novels WHERE id = ?",
        [Number(id)]
      );
      setNovel(result);
    } catch (error) {
      console.error("Failed to load novel:", error);
    }
  }

  async function checkBookshelf() {
    try {
      const stored = await AsyncStorage.getItem(BOOKSHELF_KEY);
      if (stored) {
        const ids: number[] = JSON.parse(stored);
        setIsInBookshelf(ids.includes(Number(id)));
      }
    } catch (error) {
      console.error("Failed to check bookshelf:", error);
    }
  }

  async function toggleBookshelf() {
    try {
      const stored = await AsyncStorage.getItem(BOOKSHELF_KEY);
      const ids: number[] = stored ? JSON.parse(stored) : [];

      if (isInBookshelf) {
        const newIds = ids.filter((i) => i !== Number(id));
        await AsyncStorage.setItem(BOOKSHELF_KEY, JSON.stringify(newIds));
        setIsInBookshelf(false);
      } else {
        ids.push(Number(id));
        await AsyncStorage.setItem(BOOKSHELF_KEY, JSON.stringify(ids));
        setIsInBookshelf(true);
      }
    } catch (error) {
      console.error("Failed to update bookshelf:", error);
    }
  }

  if (!novel) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.title}>{novel.title}</Text>
          <Text style={styles.author}>{novel.author}</Text>

          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: statusColors[novel.status] || "#999" }]}>
              <Text style={styles.badgeText}>{statusMapping[novel.status]}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: "#666" }]}>
              <Text style={styles.badgeText}>{genreMapping[novel.genre]}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: "#999" }]}>
              <Text style={styles.badgeText}>{ptypeMapping[novel.ptype]}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatNumber(novel.click_num)}</Text>
          <Text style={styles.statLabel}>Clicks</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatNumber(novel.word_num)}</Text>
          <Text style={styles.statLabel}>Words</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatNumber(novel.like_num)}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatNumber(novel.praise_num)}</Text>
          <Text style={styles.statLabel}>Praises</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, isInBookshelf && styles.actionButtonActive]}
          onPress={toggleBookshelf}
        >
          <Text style={[styles.actionText, isInBookshelf && styles.actionTextActive]}>
            {isInBookshelf ? "In Bookshelf" : "Add to Bookshelf"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            Alert.alert("Open in SFACG", `Open novel ${novel.id} in browser?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Open" },
            ]);
          }}
        >
          <Text style={styles.actionText}>Open in SFACG</Text>
        </TouchableOpacity>
      </View>

      {novel.last_update && (
        <View style={styles.meta}>
          <Text style={styles.metaText}>Last Update: {novel.last_update}</Text>
        </View>
      )}
    </ScrollView>
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
  info: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  author: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  badges: {
    flexDirection: "row",
    marginTop: 8,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    color: "#fff",
  },
  stats: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
  },
  statLabel: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2196F3",
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonActive: {
    backgroundColor: "#2196F3",
  },
  actionText: {
    fontSize: 14,
    color: "#2196F3",
  },
  actionTextActive: {
    color: "#fff",
  },
  meta: {
    padding: 16,
  },
  metaText: {
    fontSize: 12,
    color: "#999",
  },
});
