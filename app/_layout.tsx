import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Modal, Pressable, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { initDatabase, isFirstInit } from "../utils/database";
import Toast from "react-native-toast-message";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider, useTheme } from "../components/ThemeProvider";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";

const WELCOME_SHOWN_KEY = "welcome_shown_v1";
const QQ_GROUP = "881041631";

const TIPS = [
  "数据完全离线:断网也能浏览全部小说元数据",
  "点击标题旁的 #ID 可一键复制小说 ID",
  "长按返回按钮可快速回到首页",
  "在设置中可切换浅色 / 深色 / 跟随系统主题",
  "书架数据仅存于本地,重置全局数据不影响书架",
  "点击背投图片可全屏预览大图",
  "发现 bug 或有建议?在关于页提交 Issue 或加入 QQ 群反馈",
];

function LoadingScreen() {
  const { colors } = useTheme();
  // logo 呼吸动画
  const logoOpacity = useRef(new Animated.Value(0.6)).current;
  // 小技巧轮换
  const [tipIndex, setTipIndex] = useState(0);
  const tipOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(logoOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0.5, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // 每 6s 淡出切换一条小技巧
  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(tipOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setTipIndex((i) => (i + 1) % TIPS.length);
        Animated.timing(tipOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <Animated.Image
        source={require("../assets/icon.png")}
        style={[styles.logo, { opacity: logoOpacity }]}
      />
      <Text style={[styles.appName, { color: colors.text }]}>Novly</Text>
      <Text style={[styles.tagline, { color: colors.textSecondary }]}>
        离线优先的轻小说元数据浏览器
      </Text>

      <View style={styles.tipBox}>
        <Animated.Text
          style={[styles.tipText, { color: colors.textTertiary, opacity: tipOpacity }]}
          numberOfLines={3}
        >
          💡 {TIPS[tipIndex]}
        </Animated.Text>
      </View>

      <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
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
  const { colors, mode } = useTheme();

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
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
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
        <Stack.Screen
          name="changelog"
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
    // 仅首次初始化(需解压 hot+warm)时 LoadingScreen 至少展示 3s;
    // 快速路径(库已就绪)直接渲染页面,不显示 loading
    const start = Date.now();
    initDatabase()
      .then(() => {
        if (!isFirstInit) {
          setReady(true);
          return;
        }
        const elapsed = Date.now() - start;
        const wait = Math.max(0, 3000 - elapsed);
        setTimeout(() => setReady(true), wait);
      })
      .catch((e) => setError(e.message));
  }, []);

  // 欢迎弹窗:页面渲染成功(ready)后再延迟 2s 弹出,不抢占 LoadingScreen
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      AsyncStorage.getItem(WELCOME_SHOWN_KEY)
        .then((v) => {
          if (!v) setShowWelcome(true);
        })
        .catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [ready]);

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
            onPress={() => {
              onCopyQQ();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.welcomeBtnText}>
              {"复制群号加入"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.welcomeLater}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.welcomeLaterText, { color: colors.textTertiary }]}>
              {"以后再说"}
            </Text>
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
  logo: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    alignSelf: "stretch",
    textAlign: "center",
  },
  tagline: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginTop: Spacing.xs,
    alignSelf: "stretch",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  tipBox: {
    marginTop: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
    maxWidth: 320,
    minHeight: 60,
    justifyContent: "center",
  },
  tipText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  spinner: {
    marginTop: Spacing.xl * 2,
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
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: Spacing.lg,
    alignSelf: "stretch",
    textAlign: "center",
    paddingHorizontal: 2,
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
    fontWeight: "600",
    paddingHorizontal: 2,
  },
  welcomeGroupValue: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: 2,
  },
  welcomeBtn: {
    height: 46,
    alignSelf: "stretch",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeBtnLocked: {
    opacity: 0.5,
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
    fontWeight: "600",
    paddingHorizontal: 2,
  },
});
