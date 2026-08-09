import { View, Image, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius } from "../constants/theme";
import { coverUrl } from "../utils/urls";
import { delayImageLoad } from "../utils/imageDelay";
import { ImageShimmer } from "./ImageShimmer";
import { useTheme } from "./ThemeProvider";

interface CoverProps {
  cover: string | null;
  width?: number;
  height?: number;
  borderRadius?: number;
}

export function Cover({ cover, width = 48, height = 64, borderRadius = BorderRadius.sm }: CoverProps) {
  const { colors } = useTheme();
  const uri = coverUrl(cover);
  const [ready, setReady] = useState(false);
  // 图片实际宽高比(宽/高):加载后按真实比例渲染,避免固定容器裁剪封面
  const [aspect, setAspect] = useState<number | null>(null);

  // 人为延迟加载(便于测试加载动画);上线置 0 后立即 ready
  // uri 变化时重置加载状态(渲染期调整,React 19 推荐替代 effect 内 setState)
  const [prevUri, setPrevUri] = useState(uri);
  if (prevUri !== uri) {
    setPrevUri(uri);
    setReady(false);
    setAspect(null);
  }

  useEffect(() => {
    let cancelled = false;
    if (!uri) return;
    delayImageLoad().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  // 获取图片实际尺寸(原生/web 通用),按真实比例渲染避免裁剪;失败则保持占位高度
  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setAspect(w / h);
      },
      () => {
        // 尺寸获取失败:保持占位高度
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (uri && !ready) {
    return <ImageShimmer width={width} height={height} borderRadius={borderRadius} />;
  }

  if (uri) {
    // 使用实际比例:高度 = 宽度 / 实际宽高比;加载完成前用传入高度占位
    const displayHeight = aspect ? width / aspect : height;
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width, height: displayHeight, borderRadius, backgroundColor: colors.surfaceBorder }]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.fallback, { width, height, borderRadius, backgroundColor: colors.surfaceBorder }]}>
      <Ionicons name="book-outline" size={Math.min(width, height) * 0.4} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  fallback: {
    justifyContent: "center",
    alignItems: "center",
  },
});
