import { View, StyleSheet, TouchableOpacity, Animated, ScrollView, NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions, Dimensions, Image, Text } from "react-native";
import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { BannerItem, type BannerNovel } from "./IndexBannerItem";
import { useTheme } from "./ThemeProvider";
import { FontSize, Spacing } from "../constants/theme";

const AUTOPLAY_INTERVAL = 3500;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const QQ_GROUP = "881041631";

export type { BannerNovel };

/**
 * 固定 banner 插槽:轮播第一张固定项(欢迎加群 / 网站宣传 / changelog 等)。
 * 通过自定义 render 渲染内容、onPress 处理点击,可任意扩展。
 */
export interface PinnedBanner {
  /** 唯一 id(建议用负数,避开数据库小说 id) */
  id: number;
  /** 卡片内容渲染(接收卡片宽高) */
  render: (width: number, height: number) => ReactNode;
  /** 点击行为 */
  onPress?: () => void;
}

/** 默认固定项:欢迎加入 QQ 群(logo + 文案 + QQ 号,点击复制群号) */
export const DEFAULT_PINNED: PinnedBanner = {
  id: -1,
  render: (width, height) => <WelcomeCard width={width} height={height} />,
  onPress: () => {
    Clipboard.setStringAsync(QQ_GROUP);
    Toast.show({
      type: "success",
      text1: "已复制QQ群号",
      text2: QQ_GROUP,
      position: "top",
    });
  },
};

/** 根据屏幕宽度返回适配的轮播图高度(容器宽高比 > 2:1,图片核心画面在 35%~95% 区域,不做截取调整) */
function getBannerHeight(winWidth: number): number {
  if (winWidth >= 1024) return 400;
  if (winWidth >= 768) return 320;
  if (winWidth >= 600) return 280;
  return Math.round(winWidth * 0.45);
}

const MAX_PINS = 4;
const MAX_ITEMS = 10;
const DEFAULT_ITEMS = 6;

interface BannerProps {
  data: BannerNovel[];
  itemWidth?: number;
  itemHeight?: number;
  /** 固定 banner 数组(最多 4 个),依次作为轮播前几张 */
  pinned?: PinnedBanner[];
  /** 轮播总数量上限(默认 6,最多 10) */
  maxItems?: number;
}

export function Banner({
  data,
  itemWidth,
  itemHeight,
  pinned = [DEFAULT_PINNED],
  maxItems = DEFAULT_ITEMS,
}: BannerProps) {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  // 扩展索引(0=fake last, 1..n=真实项, n+1=fake first),始终单向递增
  const [extIndex, setExtIndex] = useState(1);
  const isTransitioning = useRef(false);
  // 用户正在手动滑动:期间暂停自动播放,避免自动/手动竞争导致卡在两图之间
  const userInteracting = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 强制重新渲染以适配屏幕旋转
  const [renderKey, setRenderKey] = useState(0);

  // 监听屏幕尺寸变化，重绘轮播
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", () => {
      setRenderKey((k) => k + 1);
    });
    return () => sub.remove();
  }, []);

  const itemW = itemWidth ?? winWidth;
  const finalHeight = itemHeight ?? getBannerHeight(winWidth);

  // 固定项(最多 MAX_PINS 个)排在前面,后接随机数据;总数量不超过 maxItems(封顶 MAX_ITEMS)
  const pins = pinned.slice(0, MAX_PINS);
  const limit = Math.min(Math.max(maxItems, 1), MAX_ITEMS);
  const remaining = Math.max(limit - pins.length, 0);
  const items: BannerNovel[] = [
    ...pins.map((p) => ({ id: p.id, title: "pinned", author: null })),
    ...data.slice(0, remaining),
  ];
  const pinnedIds = new Set(pins.map((p) => p.id));

  // Build infinite list: [last, ...items, first]
  const extendedData = items.length > 1 ? [items[items.length - 1], ...items, items[0]] : items;
  const extendedCount = extendedData.length;

  // Init scroll position to the first real item
  useEffect(() => {
    if (scrollRef.current && items.length > 1) {
      scrollRef.current.scrollTo({ x: 1 * itemW, animated: false });
    }
  }, [items.length, itemW]);

  // Autoplay: 只往一个方向前进,到达 fake first 后由下面的 effect 无缝回跳 real first。
  // 用户手动滑动期间(或停止后 4s 内)暂停,避免与自动播放竞争导致画面来回抖动
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      if (userInteracting.current) return;
      setExtIndex((prev) => Math.min(prev + 1, extendedCount - 1));
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [items.length, extendedCount]);

  // 用户开始拖拽:暂停自动播放
  const handleScrollBeginDrag = useCallback(() => {
    userInteracting.current = true;
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }
  }, []);

  // 用户结束拖拽:延迟 4s 恢复自动播放,避免松手瞬间被自动播放抢走
  const handleScrollEndDrag = useCallback(() => {
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
    }
    resumeTimer.current = setTimeout(() => {
      userInteracting.current = false;
      resumeTimer.current = null;
    }, 4000);
  }, []);

  // Animate to new index; 到达 fake first 后等动画结束无缝跳回 real first(方向不变)
  useEffect(() => {
    if (items.length <= 1) return;
    scrollRef.current?.scrollTo({ x: extIndex * itemW, animated: true });
    if (extIndex === extendedCount - 1) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 1 * itemW, animated: false });
        setExtIndex(1);
      }, 400); // 略大于滚动动画时长
      return () => clearTimeout(t);
    }
  }, [extIndex, items.length, itemW, extendedCount]);

  // Handle momentum scroll end — detect current page and handle infinite loop jumps
  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (items.length <= 1 || isTransitioning.current) return;

      const x = e.nativeEvent.contentOffset.x;
      const rawIdx = Math.round(x / itemW);

      // If we landed on a fake item, jump without animation
      if (rawIdx === 0) {
        // Landed on fake "last" — jump to real last
        isTransitioning.current = true;
        const target = items.length; // extended index of real last
        scrollRef.current?.scrollTo({ x: target * itemW, animated: false });
        setExtIndex(target);
        requestAnimationFrame(() => {
          isTransitioning.current = false;
        });
      } else if (rawIdx === extendedCount - 1) {
        // Landed on fake "first" — jump to real first
        isTransitioning.current = true;
        const target = 1; // extended index of real first
        scrollRef.current?.scrollTo({ x: target * itemW, animated: false });
        setExtIndex(target);
        requestAnimationFrame(() => {
          isTransitioning.current = false;
        });
      } else {
        setExtIndex(rawIdx);
      }
    },
    [items.length, extendedCount, itemW]
  );

  // Handle manual scroll (drag)
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handlePinnedPress = (id: number) => {
    const pin = pins.find((p) => p.id === id);
    pin?.onPress?.();
  };

  if (items.length === 0) return null;
  if (items.length === 1) {
    const only = items[0];
    const onlyPin = pins.find((p) => p.id === only.id);
    return (
      <View style={styles.container}>
        <View style={[styles.bannerWrapper, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.bannerItem, { width: itemW, height: finalHeight }]}
            activeOpacity={0.9}
            onPress={onlyPin ? () => onlyPin.onPress?.() : () => {}}
          >
            {onlyPin ? onlyPin.render(itemW, finalHeight) : (
              <BannerItem id={only.id} title={only.title} author={only.author} width={itemW} height={finalHeight} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.bannerWrapper, { backgroundColor: colors.surface }]}>
        <Animated.ScrollView
          key={renderKey}
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumEnd}
          style={styles.scrollView}
        >
          {extendedData.map((item, index) => {
            const isPinned = pinnedIds.has(item.id);
            const pin = pins.find((p) => p.id === item.id);
            return (
              <TouchableOpacity
                key={`${item.id}-${index}`}
                style={[styles.bannerItem, { width: itemW, height: finalHeight }]}
                activeOpacity={0.9}
                onPress={isPinned ? () => handlePinnedPress(item.id) : () => {}}
              >
                {isPinned && pin ? (
                  pin.render(itemW, finalHeight)
                ) : (
                  <BannerItem id={item.id} title={item.title} author={item.author} width={itemW} height={finalHeight} />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.ScrollView>
      </View>

      {/* Indicators */}
      {items.length > 1 && (
        <View style={styles.indicatorsContainer}>
          <View style={styles.indicators}>
            {items.map((_, i) => {
              // Map real index to extended scroll position
              const extOffset = (i + 1) * itemW;
              const inputRange = [
                extOffset - itemW,
                extOffset,
                extOffset + itemW,
              ];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 24, 8],
                extrapolate: "clamp",
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={i}
                  style={[styles.indicator, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

/** 欢迎加群卡片:logo + 欢迎文案 + QQ 号,无 title#id 文字 */
function WelcomeCard({ width, height }: { width: number; height: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.welcomeCard, { width, height, backgroundColor: colors.primary }]}>
      <Image source={require("../assets/icon.png")} style={styles.welcomeLogo} />
      <Text style={styles.welcomeTitle}>欢迎加入QQ群</Text>
      <Text style={styles.welcomeGroup}>{QQ_GROUP}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: "center",
    width: "100%",
  },
  bannerWrapper: {
    width: "100%",
    paddingHorizontal: 0,
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
    elevation: 3,
  },
  scrollView: {
    flexDirection: "row",
  },
  bannerItem: {
    flex: 1,
  },
  welcomeCard: {
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
  },
  welcomeLogo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginBottom: Spacing.sm,
  },
  welcomeTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  welcomeGroup: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },
  indicatorsContainer: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  indicators: {
    flexDirection: "row",
    gap: 6,
  },
  indicator: {
    height: 3,
    borderRadius: 1.5,
  },
});
