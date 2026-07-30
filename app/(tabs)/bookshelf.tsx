import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Link } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDatabase } from "../../lib/data/database";
import { formatNumber } from "../../utils/mappings";
import { TabHeader } from "../../components/TabHeader";
import { Colors } from "../../constants/theme";

interface Novel {
  id: number;
  title: string;
  author: string | null;
  click_num: number | null;
}

const STORAGE_KEY = "bookshelf";

export default function BookshelfScreen() {
  const [novels, setNovels] = useState<Novel[]>([]);

  useEffect(() => {
    loadBookshelf();
  }, []);

  async function loadBookshelf() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids: number[] = JSON.parse(stored);
        if (ids.length > 0) {
          const db = await getDatabase();
          const placeholders = ids.map(() => "?").join(",");
          const results = await db.getAllAsync<Novel>(
            `SELECT id, title, author, click_num FROM novels WHERE id IN (${placeholders})`,
            ids
          );
          setNovels(results);
        }
      }
    } catch (error) {
      console.error("Failed to load bookshelf:", error);
    }
  }

  async function removeFromBookshelf(id: number) {
    Alert.alert("Remove", "Remove from bookshelf?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
              const ids: number[] = JSON.parse(stored);
              const newIds = ids.filter((i) => i !== id);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
              setNovels((prev) => prev.filter((n) => n.id !== id));
            }
          } catch (error) {
            console.error("Failed to remove from bookshelf:", error);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.wrapper}>
      <TabHeader />
      <FlatList
        style={styles.container}
      data={novels}
      keyExtractor={(item) => item.id.toString()}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No novels in bookshelf</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Link href={`/novel/${item.id}`} asChild>
          <TouchableOpacity style={styles.novelItem}>
            <View style={styles.novelInfo}>
              <Text style={styles.novelTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.novelAuthor}>{item.author}</Text>
            </View>
            <TouchableOpacity onPress={() => removeFromBookshelf(item.id)}>
              <Text style={styles.removeButton}>Remove</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Link>
      )}
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
  removeButton: {
    fontSize: 12,
    color: "#f44336",
  },
});
