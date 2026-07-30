import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useState, useEffect } from "react";
import { getDatabase } from "../lib/data/database";
import { genreMapping } from "../utils/mappings";

interface GenreCount {
  genre: number;
  count: number;
}

export default function GenresScreen() {
  const [genres, setGenres] = useState<GenreCount[]>([]);

  useEffect(() => {
    loadGenres();
  }, []);

  async function loadGenres() {
    try {
      const db = await getDatabase();
      const results = await db.getAllAsync<GenreCount>(
        "SELECT genre, COUNT(*) as count FROM novels GROUP BY genre ORDER BY count DESC"
      );
      setGenres(results);
    } catch (error) {
      console.error("Failed to load genres:", error);
    }
  }

  return (
    <FlatList
      style={styles.container}
      data={genres}
      keyExtractor={(item) => item.genre.toString()}
      renderItem={({ item }) => (
        <Link href={`/novels?genre=${item.genre}`} asChild>
          <TouchableOpacity style={styles.genreItem}>
            <Text style={styles.genreName}>{genreMapping[item.genre]}</Text>
            <Text style={styles.genreCount}>{item.count}</Text>
          </TouchableOpacity>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  genreItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  genreName: {
    flex: 1,
    fontSize: 16,
  },
  genreCount: {
    fontSize: 14,
    color: "#999",
  },
});
