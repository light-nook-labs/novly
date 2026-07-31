import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { initDatabase } from "../utils/database";
import Toast from "react-native-toast-message";
import { ThemeProvider, useTheme } from "../components/ThemeProvider";

function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading database...
      </Text>
    </View>
  );
}

function BackButton() {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
      <Ionicons name="chevron-back" size={24} color={colors.primary} />
    </TouchableOpacity>
  );
}

function AppContent({ ready, error }: { ready: boolean; error: string | null }) {
  const { colors } = useTheme();

  if (error) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>
          Failed to initialize database
        </Text>
        <Text style={[styles.errorDetail, { color: colors.textTertiary }]}>
          {error}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="novel/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="search"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="search/banners"
          options={{ headerShown: false }}
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
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="tag/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="contests"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="contest/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="genres"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="genre/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="statuses"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="status/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false }}
        />
      </Stack>
      <Toast />
    </View>
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

  return (
    <ThemeProvider>
      <AppContent ready={ready} error={error} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  errorDetail: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
