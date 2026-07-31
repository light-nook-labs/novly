import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../utils/database";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";
import { Loading } from "../components/Loading";

interface Contest {
  id: number;
  name: string;
  novel_count: number;
}

const CACHE_KEY = "contests_cache_v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CacheEntry {
  timestamp: number;
  contests: Contest[];
}

export default function ContestsScreen() {
  const { colors } = useTheme();
  const [contests, setContests] = useState<Contest[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        list: {
          padding: Spacing.lg,
        },
        contestItem: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          backgroundColor: colors.surface,
          marginBottom: Spacing.sm,
          borderRadius: BorderRadius.md,
          gap: Spacing.md,
        },
        iconWrap: {
          width: 32,
          height: 32,
          borderRadius: BorderRadius.sm,
          backgroundColor: colors.primary + "15",
          justifyContent: "center",
          alignItems: "center",
        },
        contestInfo: {
          flex: 1,
        },
        contestName: {
          fontSize: FontSize.md,
          fontWeight: "600",
          color: colors.text,
        },
        novelCount: {
          fontSize: FontSize.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        loading: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: Spacing.md,
        },
        loadingText: {
          fontSize: FontSize.md,
          color: colors.textTertiary,
        },
        empty: {
          alignItems: "center",
          paddingVertical: Spacing.xl * 2,
          gap: Spacing.md,
        },
        emptyText: {
          fontSize: FontSize.md,
          color: colors.textTertiary,
        },
      }),
    [colors]
  );

  useEffect(() => {
    loadContests();
  }, []);

  async function loadContests() {
    try {
      // 1. Try cache first for instant first screen
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          setContests(entry.contests);
          setLoading(false);
          return;
        }
      }

      // 2. Load all contests from DB (data is small)
      const db = await getDatabase();
      const results = await db.getAllAsync<Contest>(
        `SELECT c.id, c.name, COUNT(n.id) as novel_count
         FROM contests c
         LEFT JOIN novels n ON c.id = n.contest_id
         GROUP BY c.id
         ORDER BY novel_count DESC, c.name ASC`
      );
      setContests(results);

      // 3. Write cache
      const entry: CacheEntry = { timestamp: Date.now(), contests: results };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
      console.error("Failed to load contests:", error);
    } finally {
      setLoading(false);
    }
  }

  // In-memory filtering for instant search
  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return contests;
    return contests.filter((c) => c.name.toLowerCase().includes(kw));
  }, [contests, query]);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Contests"
        titleAppend={contests.length > 0 ? String(contests.length) : undefined}
        search={query}
        setSearch={setQuery}
      />

      {loading && contests.length === 0 ? (
        <Loading />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>未找到匹配的赛事</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Link href={`/contest/${item.id}`} asChild>
              <TouchableOpacity style={styles.contestItem} activeOpacity={0.7}>
                <View style={styles.iconWrap}>
                  <Ionicons name="trophy-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.contestInfo}>
                  <Text style={styles.contestName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.novelCount}>{item.novel_count} 部作品</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </Link>
          )}
        />
      )}
    </View>
  );
}
