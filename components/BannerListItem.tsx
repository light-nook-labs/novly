import { useState, useEffect } from "react";
import { Text, Image, TouchableOpacity, StyleSheet, View, Platform, Animated, Modal, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ID } from "./ID";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";
import { ImageShimmer } from "./ImageShimmer";
import { delayImageLoad } from "../utils/imageDelay";
import { type BannerNovel } from "../types/models";

const BANNER_PREFIX = "https://rs.sfacg.com/web/novel/images/images/beitouNew/";

export type { BannerNovel };

interface BannerItemProps extends BannerNovel {
  /** 固定宽度;不传时用 onLayout 自适应测量(配合百分比宽度排布) */
  width?: number;
  /** 固定高度（由父组件传入），不传时按宽度比例计算 */
  height?: number;
}

/** 根据容器宽度返回适配的 Banner 高度(宽高比 > 2:1,保持图片截取逻辑不变) */
function getBannerHeight(w: number): number {
  if (w >= 1024) return 400;
  if (w >= 768) return 320;
  if (w >= 600) return 280;
  return Math.round(w * 0.45);
}

export function BannerListItem({ id, title, author, width, height }: BannerItemProps) {
  const { colors } = useTheme();
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [measuredW, setMeasuredW] = useState(0);
  const [pulseAnim] = useState(() => new Animated.Value(0.3));
  const [imgOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的挂载执行)
  }, []);

  const uri = BANNER_PREFIX + id + ".jpg";
  const containerWidth = width ?? measuredW;
  const fixedHeight = height ?? getBannerHeight(containerWidth || 1);

  // uri 变化时重置加载状态(渲染期调整,React 19 推荐替代 effect 内 setState)
  const [prevUri, setPrevUri] = useState(uri);
  if (prevUri !== uri) {
    setPrevUri(uri);
    setLoadError(false);
    setReady(false);
  }

  useEffect(() => {
    let cancelled = false;
    imgOpacity.setValue(0);
    // 人为延迟加载(便于测试加载动画);上线置 0 后立即 ready
    delayImageLoad().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的 uri 变化执行)
  }, [uri]);

  function handleLongPress() {
    if (Platform.OS === "web") {
      window.open(uri, "_blank");
    }
  }

  function handleTitlePress() {
    router.push(`/novels/${id}`);
  }

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        if (!width) setMeasuredW(e.nativeEvent.layout.width);
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.imageCard,
          { width: containerWidth, height: fixedHeight, backgroundColor: colors.surfaceBorder },
        ]}
        onPress={() => setShowLightbox(true)}
        onLongPress={handleLongPress}
      >
        {loadError ? (
          <View
            style={[styles.fallback, { width: containerWidth, height: fixedHeight, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.fallbackText, { color: colors.primary }]}>{title}</Text>
          </View>
        ) : !ready ? (
          <ImageShimmer width={containerWidth} height={fixedHeight} borderRadius={BorderRadius.lg} />
        ) : (
          <View
            style={{
              width: containerWidth,
              height: fixedHeight,
              overflow: "hidden",
              backgroundColor: colors.surfaceBorder,
            }}
          >
            {/* 图片加载中显示水波占位,onLoad 后淡入,避免露出黑/白容器 */}
            <ImageShimmer width={containerWidth} height={fixedHeight} borderRadius={BorderRadius.lg} />
            <Animated.Image
              source={{ uri }}
              style={{
                position: "absolute",
                left: -containerWidth * 0.65,
                width: containerWidth * 1.65,
                height: fixedHeight,
                opacity: imgOpacity,
              }}
              resizeMode="cover"
              onLoad={() => {
                Animated.timing(imgOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
              }}
              onError={() => setLoadError(true)}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Lightbox */}
      <Modal visible={showLightbox} transparent animationType="fade" onRequestClose={() => setShowLightbox(false)}>
        <Pressable style={styles.lightbox} onPress={() => setShowLightbox(false)}>
          <Image source={{ uri }} style={styles.lightboxImage} resizeMode="contain" />
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setShowLightbox(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      <TouchableOpacity activeOpacity={0.7} style={styles.textRow} onPress={handleTitlePress}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <ID id={id} weight="700" />
        </View>
        {author && (
          <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>
            {author}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  imageCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    elevation: 2,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {},
  textRow: {
    paddingHorizontal: Spacing.xs,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    flex: 1,
    flexShrink: 1, // 窄卡片(多列)时标题收缩,#id 不溢出容器
  },
  author: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  fallback: {
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  fallbackText: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    textAlign: "center",
    alignSelf: "stretch",
  },
  loading: {
    justifyContent: "center",
    alignItems: "center",
  },
  lightbox: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.98)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
  lightboxClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});
