import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useState, useEffect } from "react";
import { getDatabase } from "../lib/data/database";
import { ptypeMapping } from "../utils/mappings";

interface PtypeCount {
  ptype: number;
  count: number;
}

export default function PtypesScreen() {
  const [ptypes, setPtypes] = useState<PtypeCount[]>([]);

  useEffect(() => {
    loadPtypes();
  }, []);

  async function loadPtypes() {
    try {
      const db = await getDatabase();
      const results = await db.getAllAsync<PtypeCount>(
        "SELECT ptype, COUNT(*) as count FROM novels GROUP BY ptype ORDER BY count DESC"
      );
      setPtypes(results);
    } catch (error) {
      console.error("Failed to load ptypes:", error);
    }
  }

  return (
    <FlatList
      style={styles.container}
      data={ptypes}
      keyExtractor={(item) => item.ptype.toString()}
      renderItem={({ item }) => (
        <Link href={`/novels?ptype=${item.ptype}`} asChild>
          <TouchableOpacity style={styles.ptypeItem}>
            <Text style={styles.ptypeName}>{ptypeMapping[item.ptype]}</Text>
            <Text style={styles.ptypeCount}>{item.count}</Text>
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
  ptypeItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  ptypeName: {
    flex: 1,
    fontSize: 16,
  },
  ptypeCount: {
    fontSize: 14,
    color: "#999",
  },
});
