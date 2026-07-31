import { useState, useEffect, useRef } from "react";
import { Text, Image, TouchableOpacity, StyleSheet, View, useWindowDimensions, Animated } from "react-native";
import { router } from "expo-router";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

export interface BannerNovel {
  id: number;
  title: string;
  author: string | null;
}

interface BannerItemProps extends BannerNovel {
  width?: number;
  height?: number;
}

const BANNER_PREFIX = "https://rs.sfacg.com/web/novel/images/images/beitouNew/";

function LoadingPlaceholder({ width, height }: { width: number; height: number }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.placeholder,
        { width, height, opacity, backgroundColor: colors.surfaceBorder },
      ]}
    />
  );
}

export function BannerItem({ id, title, author, width, height }: BannerItemProps) {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const containerWidth = width ?? winWidth;
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const uri = BANNER_PREFIX + id + ".jpg";

  useEffect(() => {
    setLoaded(false);
    setLoadError(false);
    Image.getSize(
      uri,
      () => setLoaded(true),
      () => { setLoadError(true); setLoaded(true); }
    );
  }, [uri]);

  const fixedHeight = height ?? containerWidth * 0.5;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, { width: containerWidth, height: fixedHeight, backgroundColor: colors.surfaceBorder }]}
      onPress={() => router.push(`/novel/${id}`)}
    >
      {loadError ? (
        <View style={[styles.fallback, { width: containerWidth, height: fixedHeight, backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.fallbackText, { color: colors.primary }]}>{title}</Text>
        </View>
      ) : !loaded ? (
        <LoadingPlaceholder width={containerWidth} height={fixedHeight} />
      ) : (
        <View style={{ width: containerWidth, height: fixedHeight, overflow: "hidden" }}>
          <Image
            source={{ uri }}
            style={{
              position: "absolute",
              left: -containerWidth * 0.3,
              width: containerWidth * 1.3,
              height: fixedHeight,
            }}
            resizeMode="cover"
          />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}<Text style={styles.id}> #{id}</Text></Text>
        {author && <Text style={styles.author} numberOfLines={1}>{author}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  placeholder: {},
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  id: {
    fontSize: FontSize.lg,
    fontWeight: "400",
    color: "rgba(255,255,255,0.7)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  author: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  fallback: {
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  fallbackText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    textAlign: "center",
  },
});
