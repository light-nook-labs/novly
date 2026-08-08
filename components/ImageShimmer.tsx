import { Animated, View } from "react-native";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

interface ImageShimmerProps {
  width: number;
  height: number;
  borderRadius?: number;
}

/**
 * 渐变光带斜扫 shimmer(Facebook/淘宝风格):
 * 多条半透明白条拼成柔和渐变光带,旋转 -18° 后从左到右反复扫过。
 * 纯 RN 实现(无 LinearGradient 依赖),位移明显、渐变柔和。
 */
export function ImageShimmer({ width, height, borderRadius = 8 }: ImageShimmerProps) {
  const { colors, mode } = useTheme();
  const [translateX] = useState(() => new Animated.Value(-width));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        duration: 1200,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的 width 变化执行)
  }, [width]);

  // 渐变光带:12 条竖条,透明度按正弦曲线渐变(伪 LinearGradient)
  const BAND = Math.max(width * 0.7, 60);
  const STRIPS = 12;
  const stripW = BAND / STRIPS;
  const maxAlpha = mode === "dark" ? 0.18 : 0.6;

  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: colors.surfaceBorder,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: -height * 0.35,
          width: BAND,
          height: height * 1.7,
          transform: [{ translateX }, { rotate: "-18deg" }],
        }}
      >
        {Array.from({ length: STRIPS }).map((_, i) => {
          const t = i / (STRIPS - 1);
          const alpha = Math.sin(Math.PI * t) * maxAlpha;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: i * stripW,
                top: 0,
                width: stripW + 1,
                height: "100%",
                backgroundColor: `rgba(255,255,255,${alpha.toFixed(3)})`,
              }}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}
