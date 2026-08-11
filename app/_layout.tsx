import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Constants from "expo-constants";
import { APP_NAME, APP_SLOGAN, APP_AUTHOR, APP_FOOTER, APP_GITHUB_URL } from "../constants/appInfo";
import { initDatabase, isFirstInit, subscribeColdMerged, subscribeInitProgress } from "../utils/database";
import { Asset } from "expo-asset";
import Toast from "react-native-toast-message";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider, useTheme } from "../components/ThemeProvider";
import { FontSize, Spacing, BorderRadius, Layout } from "../constants/theme";

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
  const { colors, mode } = useTheme();
  const [initProgress, setInitProgressState] = useState<string | null>(null);
  // 初始化进度订阅(显示阶段/百分比,避免用户误以为卡死)
  useEffect(() => {
    return subscribeInitProgress(setInitProgressState);
  }, []);

  // 从进度文本(如"正在解压冷数据 45%...")提取百分比,驱动进度条
  const pctMatch = initProgress?.match(/(\d+)%/);
  // 数字进度(0-100),进度条按 flex 比例显示,避免字符串百分比类型不匹配
  const pctNum = Math.min(pctMatch ? parseInt(pctMatch[1], 10) : 0, 100);
  const version = Constants.expoConfig?.version ?? "1.0.2";
  const platformLabel = Platform.OS === "ios" ? "iOS" : Platform.OS === "web" ? "Web" : "Android";
  // logo 呼吸动画
  const [logoOpacity] = useState(() => new Animated.Value(0.6));
  // logo 缩放动画(呼吸 + 缩放,更生动,吸引用户停留)
  const [logoScale] = useState(() => new Animated.Value(1));
  // 小技巧轮换(随机起点:每次进入不再固定从第一条开始)
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [tipOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(logoOpacity, { toValue: 0.5, duration: 900, useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 0.95, duration: 900, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的挂载执行)
  }, []);

  // 每 4s 淡出切换一条小技巧
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
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的挂载执行)
  }, []);

  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Animated.Image
          source={require("../assets/icon.png")}
          style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        />
        <Text style={[styles.appName, { color: colors.text }]}>{APP_NAME}</Text>
        <Text
          style={{
            fontSize: FontSize.sm,
            color: colors.textSecondary,
            marginBottom: 8,
            alignSelf: "stretch",
            textAlign: "center",
            paddingHorizontal: 4,
          }}
        >
          v{version} · {platformLabel}
        </Text>
        <Text
          style={{
            fontSize: FontSize.sm,
            color: colors.textTertiary,
            marginBottom: Spacing.md,
            alignSelf: "stretch",
            textAlign: "center",
            fontWeight: "600",
            paddingHorizontal: 2,
          }}
        >
          {APP_AUTHOR}
        </Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>{APP_SLOGAN}</Text>

        <View style={styles.tipBox}>
          <Animated.Text
            style={[
              styles.tipText,
              { color: colors.textTertiary, opacity: tipOpacity, textAlign: "center", paddingHorizontal: 24 },
            ]}
            numberOfLines={3}
          >
            💡 {TIPS[tipIndex]}
          </Animated.Text>
        </View>
        <ActivityIndicator size="small" color={colors.primary} style={[styles.spinner, { marginTop: 16 }]} />
        {initProgress ? (
          <View style={{ alignItems: "center", marginTop: 12 }}>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                textAlign: "center",
                paddingHorizontal: 24,
                fontWeight: "600",
              }}
            >
              {initProgress}
            </Text>
            {pctNum > 0 && (
              <View
                style={{
                  height: 4,
                  width: "55%",
                  backgroundColor: colors.surfaceBorder,
                  borderRadius: 2,
                  marginTop: 8,
                  overflow: "hidden",
                }}
              >
                <View style={{ height: 4, width: `${pctNum}%`, backgroundColor: colors.primary, borderRadius: 2 }} />
              </View>
            )}
            <Text
              style={{
                fontSize: 12,
                color: colors.textTertiary,
                marginTop: 8,
                textAlign: "center",
                paddingHorizontal: 24,
                fontWeight: "600",
              }}
            >
              请耐心等待,首次启动需要初始化数据
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: "auto", alignItems: "center", paddingBottom: 16, gap: 4 }}>
        <Text
          style={{
            fontSize: 12,
            color: colors.textTertiary,
            textAlign: "center",
            fontWeight: "600",
            paddingHorizontal: 2,
          }}
        >
          {APP_FOOTER}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textTertiary,
            textAlign: "center",
            fontWeight: "600",
            paddingHorizontal: 2,
          }}
        >
          {APP_GITHUB_URL}
        </Text>
      </View>
    </View>
  );
}

function AppContent({ ready, error, onRestart }: { ready: boolean; error: string | null; onRestart: () => void }) {
  const [coldMerged, setColdMerged] = useState(false);
  const [coldProgress, setColdProgress] = useState<string | null>(null);
  // 冷合并完成(全量库就位)后,弹窗提示重启应用,防页面未及时更新
  useEffect(() => {
    const unsub = subscribeColdMerged(() => setColdMerged(true));
    return unsub;
  }, []);
  // 冷合并进度(首次启动时显示底部提示)
  useEffect(() => {
    if (!isFirstInit) return;
    const unsub = subscribeInitProgress((p) => {
      // 只在冷合并阶段显示(解压冷数据/合并冷数据/创建索引)
      if (p && (p.includes("冷数据") || p.includes("合并") || p.includes("索引"))) {
        setColdProgress(p);
      } else if (!p) {
        setColdProgress(null);
      }
    });
    return unsub;
  }, []);
  const { colors, mode } = useTheme();

  if (error) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <Text style={[styles.errorText, { color: colors.danger }]}>Failed to initialize database</Text>
        <Text style={[styles.errorDetail, { color: colors.textTertiary }]}>{error}</Text>
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
        <Stack.Screen name="novels/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="search/banners" options={{ headerShown: false }} />
        <Stack.Screen name="authors" options={{ headerShown: false }} />
        <Stack.Screen name="authors/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="tags" options={{ headerShown: false }} />
        <Stack.Screen name="tags/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="contests" options={{ headerShown: false }} />
        <Stack.Screen name="contests/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="genres" options={{ headerShown: false }} />
        <Stack.Screen name="genres/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="statuses" options={{ headerShown: false }} />
        <Stack.Screen name="statuses/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: false }} />
        <Stack.Screen name="booklists" options={{ headerShown: false }} />
        <Stack.Screen name="booklists/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="monthly" options={{ headerShown: false }} />
        <Stack.Screen name="monthly/[ym]" options={{ headerShown: false }} />
        <Stack.Screen name="moe" options={{ headerShown: false }} />
      </Stack>
      <Toast />

      <Modal visible={coldMerged} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: colors.overlay + "80", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, width: "80%", maxWidth: 360 }}>
            <Text style={{ fontSize: FontSize.xl, fontWeight: "700", color: colors.text, marginBottom: Spacing.md }}>数据已更新</Text>
            <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xl }}>
              数据库已加载完整数据,请重启应用以查看最新内容。
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
              onPress={() => {
                setColdMerged(false);
                onRestart();
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>重启应用</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 冷合并进度提示(首次启动时底部显示) */}
      {coldProgress && !coldMerged && (
        <View style={[styles.coldBanner, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
            {coldProgress}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [appKey, setAppKey] = useState(0);

  useEffect(() => {
    const start = Date.now();
    (async () => {
      // 预加载 hot .sqlite.gz:首次启动预提取到 cache(2-3s),之后 Asset.loadAsync 直接返回缓存
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro 资产打包必需
      const preloadedAssets = await Promise.all([Asset.loadAsync(require("../assets/chunks/hot_chunk.sqlite.gz"))]);
      await initDatabase({ localUri: preloadedAssets[0][0].localUri });
      if (!isFirstInit) {
        setReady(true);
        return;
      }
      const elapsed = Date.now() - start;
      const wait = Math.max(0, 3000 - elapsed);
      setTimeout(() => setReady(true), wait);
    })().catch((e: any) => setError(e.message));
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
      <AppContent key={appKey} ready={ready} error={error} onRestart={() => setAppKey((k) => k + 1)} />
      <WelcomeModal visible={showWelcome} onCopyQQ={handleJoinQQ} onClose={handleCloseWelcome} />
    </ThemeProvider>
  );
}

function WelcomeModal({ visible, onCopyQQ, onClose }: { visible: boolean; onCopyQQ: () => void; onClose: () => void }) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.welcomeBackdrop, { backgroundColor: colors.overlay + "80" }]} onPress={onClose}>
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
            <Text style={styles.welcomeBtnText}>{"复制群号加入"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.welcomeLater} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.welcomeLaterText, { color: colors.textTertiary }]}>{"以后再说"}</Text>
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
    width: Layout.iconXl,
    height: Layout.iconXl,
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
  coldBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
