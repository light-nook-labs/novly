import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { initDatabase } from "../lib/data/database";
import Toast from "react-native-toast-message";

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={styles.loadingText}>Loading database...</Text>
    </View>
  );
}

function BackButton() {
  return (
    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
      <Ionicons name="chevron-back" size={24} color="#007AFF" />
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Failed to initialize database</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="novel/[id]"
          options={{ title: "Novel Detail", headerLeft: () => <BackButton /> }}
        />
        <Stack.Screen
          name="search"
          options={{ title: "Search", headerLeft: () => <BackButton /> }}
        />
        <Stack.Screen
          name="authors"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="author/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="tags"
          options={{ title: "Tags", headerLeft: () => <BackButton /> }}
        />
        <Stack.Screen
          name="tag/[id]"
          options={{ title: "Tag Detail", headerLeft: () => <BackButton /> }}
        />
        <Stack.Screen
          name="contests"
          options={{ title: "Contests", headerLeft: () => <BackButton /> }}
        />
        <Stack.Screen
          name="contest/[id]"
          options={{ title: "Contest Detail", headerLeft: () => <BackButton /> }}
        />
        <Stack.Screen
          name="genres"
          options={{ title: "Genres", headerLeft: () => <BackButton /> }}
        />
        <Stack.Screen
          name="statuses"
          options={{ title: "Statuses", headerLeft: () => <BackButton /> }}
        />
        <Stack.Screen
          name="ptypes"
          options={{ title: "Ptypes", headerLeft: () => <BackButton /> }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false }}
        />
      </Stack>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f44336",
  },
  errorDetail: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
