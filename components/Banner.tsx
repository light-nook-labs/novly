import { View, StyleSheet, TouchableOpacity, Animated, ScrollView, NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions, Dimensions } from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { BannerItem, type BannerNovel } from "./IndexBannerItem";
import { Colors } from "../constants/theme";

const AUTOPLAY_INTERVAL = 3500;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type { BannerNovel };

/** 根据屏幕宽度返回适配的轮播图高度 */
function getBannerHeight(winWidth: number): number {
  if (winWidth >= 1024) return 400;
  if (winWidth >= 768) return 320;
  if (winWidth >= 600) return 280;
  return 200;
}

interface BannerProps {
  data: BannerNovel[];
  itemWidth?: number;
  itemHeight?: number;
}

export function Banner({ data, itemWidth, itemHeight }: BannerProps) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const isTransitioning = useRef(false);
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

  // Build infinite list: [last, ...data, first]
  const extendedData = data.length > 1 ? [data[data.length - 1], ...data, data[0]] : data;
  // Map real index -> extended index (real 0 → extended 1)
  const realToExtended = (realIdx: number) => realIdx + 1;
  const extendedCount = extendedData.length;

  // Init scroll position to the first real item
  useEffect(() => {
    if (scrollRef.current && data.length > 1) {
      scrollRef.current.scrollTo({ x: 1 * itemW, animated: false });
    }
  }, [data.length, itemW]);

  // Autoplay
  useEffect(() => {
    if (data.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % data.length);
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [data.length]);

  // Animate to new index
  useEffect(() => {
    if (data.length <= 1) return;
    const extIdx = realToExtended(currentIndex);
    scrollRef.current?.scrollTo({ x: extIdx * itemW, animated: true });
  }, [currentIndex, data.length, itemW]);

  // Handle momentum scroll end — detect current page and handle infinite loop jumps
  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (data.length <= 1 || isTransitioning.current) return;

      const x = e.nativeEvent.contentOffset.x;
      const rawIdx = Math.round(x / itemW);

      // If we landed on a fake item, jump without animation
      if (rawIdx === 0) {
        // Landed on fake "last" — jump to real last
        isTransitioning.current = true;
        const target = data.length; // extended index of real last
        scrollRef.current?.scrollTo({ x: target * itemW, animated: false });
        setCurrentIndex(data.length - 1);
        requestAnimationFrame(() => {
          isTransitioning.current = false;
        });
      } else if (rawIdx === extendedCount - 1) {
        // Landed on fake "first" — jump to real first
        isTransitioning.current = true;
        const target = 1; // extended index of real first
        scrollRef.current?.scrollTo({ x: target * itemW, animated: false });
        setCurrentIndex(0);
        requestAnimationFrame(() => {
          isTransitioning.current = false;
        });
      } else {
        setCurrentIndex(rawIdx - 1);
      }
    },
    [data.length, extendedCount, itemW]
  );

  // Handle manual scroll (drag)
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  if (data.length === 0) return null;
  if (data.length === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.bannerWrapper}>
          <TouchableOpacity
            style={[styles.bannerItem, { width: itemW, height: finalHeight }]}
            activeOpacity={0.9}
            onPress={() => {}}
          >
            <BannerItem id={data[0].id} title={data[0].title} author={data[0].author} width={itemW} height={finalHeight} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bannerWrapper}>
        <Animated.ScrollView
          key={renderKey}
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumEnd}
          style={styles.scrollView}
        >
          {extendedData.map((item, index) => (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              style={[styles.bannerItem, { width: itemW, height: finalHeight }]}
              activeOpacity={0.9}
              onPress={() => {
                // Navigate to novel detail
              }}
            >
              <BannerItem id={item.id} title={item.title} author={item.author} width={itemW} height={finalHeight} />
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>
      </View>

      {/* Indicators */}
      {data.length > 1 && (
        <View style={styles.indicatorsContainer}>
          <View style={styles.indicators}>
            {data.map((_, i) => {
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
                  style={[styles.indicator, { width: dotWidth, opacity }]}
                />
              );
            })}
          </View>
        </View>
      )}
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
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scrollView: {
    flexDirection: "row",
  },
  bannerItem: {
    flex: 1,
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
    backgroundColor: Colors.primary,
  },
});
