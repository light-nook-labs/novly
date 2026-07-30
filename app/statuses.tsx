import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useState, useEffect } from "react";
import { getDatabase } from "../lib/data/database";
import { statusMapping, statusColors } from "../utils/mappings";

interface StatusCount {
  status: number;
  count: number;
}

export default function StatusesScreen() {
  const [statuses, setStatuses] = useState<StatusCount[]>([]);

  useEffect(() => {
    loadStatuses();
  }, []);

  async function loadStatuses() {
    try {
      const db = await getDatabase();
      const results = await db.getAllAsync<StatusCount>(
        "SELECT status, COUNT(*) as count FROM novels GROUP BY status ORDER BY count DESC"
      );
      setStatuses(results);
    } catch (error) {
      console.error("Failed to load statuses:", error);
    }
  }

  return (
    <FlatList
      style={styles.container}
      data={statuses}
      keyExtractor={(item) => item.status.toString()}
      renderItem={({ item }) => (
        <Link href={`/novels?status=${item.status}`} asChild>
          <TouchableOpacity style={styles.statusItem}>
            <View style={[styles.dot, { backgroundColor: statusColors[item.status] || "#999" }]} />
            <Text style={styles.statusName}>{statusMapping[item.status]}</Text>
            <Text style={styles.statusCount}>{item.count}</Text>
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
  statusItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusName: {
    flex: 1,
    fontSize: 16,
  },
  statusCount: {
    fontSize: 14,
    color: "#999",
  },
});
