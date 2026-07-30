import { useState, useEffect } from "react";
import { Text, Image, TouchableOpacity, StyleSheet, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Colors, FontSize, Spacing, BorderRadius } from "../constants/theme";

export interface BannerNovel {
  id: number;
  title: string;
  author: string | null;
}

interface BannerItemProps extends BannerNovel {
  width?: number;
  /** 固定高度（由父组件通过断点计算传入），不传时自适应 */
  height?: number;
}

const BANNER_PREFIX = "https://rs.sfacg.com/web/novel/images/images/beitouNew/";

export function BannerItem({ id, title, author, width, height }: BannerItemProps) {
  const { width: winWidth } = useWindowDimensions();
  const containerWidth = width ?? winWidth;
  const [loadError, setLoadError] = useState(false);

  const uri = BANNER_PREFIX + id + ".jpg";

  useEffect(() => {
    setLoadError(false);
    Image.getSize(
      uri,
      () => {},
      () => setLoadError(true)
    );
  }, [uri]);

  const fixedHeight = height ?? containerWidth * 0.5;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, { width: containerWidth, height: fixedHeight }]}
      onPress={() => router.push(`/novel/${id}`)}
    >
      {loadError ? (
        <View style={[styles.fallback, { width: containerWidth, height: fixedHeight }]}>
          <Text style={styles.fallbackText}>{title}</Text>
        </View>
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
    backgroundColor: Colors.surfaceBorder,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageWrap: {
    backgroundColor: "#1a1a1a",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
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
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  fallbackText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.primary,
    textAlign: "center",
  },
});
