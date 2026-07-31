import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Modal, Pressable, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { initDatabase, dbLogs } from "../utils/database";
import Toast from "react-native-toast-message";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider, useTheme } from "../components/ThemeProvider";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";

const WELCOME_SHOWN_KEY = "welcome_shown_v1";
const QQ_GROUP = "881041631";

function LoadingScreen() {
  const { colors } = useTheme();
  const [logs, setLogs] = useState<string[]>([]);
  // 心跳计时:每 10s 递增,证明是 app 在加载(而非 bundle 还在下载)
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setLogs([...dbLogs]);
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading database...
      </Text>
      <Text style={[styles.heartbeat, { color: colors.textTertiary }]}>
        {tick === 0 ? "正在启动..." : `仍在加载中(已等待 ${tick * 10}s)...`}
      </Text>
      {logs.length > 0 && (
        <View style={styles.logBox}>
          {logs.slice(-12).map((line, i) => (
            <Text
              key={i}
              numberOfLines={1}
              style={[styles.logLine, { color: colors.textTertiary }]}
            >
              {line}
            </Text>
          ))}
        </View>
      )}
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
        <Stack.Screen
          name="about"
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
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);

  // 首次启动时展示欢迎弹窗,鼓励加入 QQ 群
  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SHOWN_KEY)
      .then((v) => {
        if (!v) setShowWelcome(true);
      })
      .catch(() => {});
  }, []);

  const handleJoinQQ = () => {
    Clipboard.setStringAsync(QQ_GROUP);
    Toast.show({
      type: "success",
      text1: "已复制QQ群号",
      text2: QQ_GROUP,
      position: "top",
    });
  };

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    AsyncStorage.setItem(WELCOME_SHOWN_KEY, "1").catch(() => {});
  };

  return (
    <ThemeProvider>
      <AppContent ready={ready} error={error} />
      <WelcomeModal
        visible={showWelcome}
        onCopyQQ={handleJoinQQ}
        onClose={handleCloseWelcome}
      />
    </ThemeProvider>
  );
}

function WelcomeModal({
  visible,
  onCopyQQ,
  onClose,
}: {
  visible: boolean;
  onCopyQQ: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.welcomeBackdrop} onPress={onClose}>
        <Pressable style={[styles.welcomeCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={[styles.welcomeIconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="chatbubbles-outline" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>欢迎使用 Novly</Text>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
            加入我们的 QQ 群,反馈建议、参与讨论,第一时间获取更新信息
          </Text>
          <View style={[styles.welcomeGroup, { backgroundColor: colors.surfaceBorder }]}>
            <Text style={[styles.welcomeGroupLabel, { color: colors.textTertiary }]}>QQ Group</Text>
            <Text style={[styles.welcomeGroupValue, { color: colors.text }]}>{QQ_GROUP}</Text>
          </View>
          <TouchableOpacity
            style={[styles.welcomeBtn, { backgroundColor: colors.primary }]}
            onPress={onCopyQQ}
            activeOpacity={0.8}
          >
            <Text style={styles.welcomeBtnText}>复制群号加入</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.welcomeLater} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.welcomeLaterText, { color: colors.textTertiary }]}>以后再说</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
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
    fontWeight: "600",
    alignSelf: "stretch",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  heartbeat: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    alignSelf: "stretch",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  logBox: {
    marginTop: 20,
    paddingHorizontal: 24,
    width: "100%",
  },
  logLine: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    paddingHorizontal: 2,
    fontFamily: "monospace",
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
  welcomeBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  welcomeCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  welcomeIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    alignSelf: "stretch",
    textAlign: "center",
  },
  welcomeText: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    alignSelf: "stretch",
    textAlign: "center",
  },
  welcomeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  welcomeGroupLabel: {
    fontSize: FontSize.sm,
  },
  welcomeGroupValue: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    letterSpacing: 1,
  },
  welcomeBtn: {
    height: 46,
    alignSelf: "stretch",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeBtnText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#fff",
  },
  welcomeLater: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  welcomeLaterText: {
    fontSize: FontSize.sm,
  },
});
