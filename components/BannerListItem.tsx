import { useState, useEffect } from "react";
import {
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  View,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ID } from "./ID";
import { Colors, FontSize, Spacing, BorderRadius } from "../constants/theme";

const BANNER_PREFIX = "https://rs.sfacg.com/web/novel/images/images/beitouNew/";

export interface BannerNovel {
  id: number;
  title: string;
  author: string | null;
}

interface BannerItemProps extends BannerNovel {
  width: number;
  /** 固定高度（由父组件传入），不传时按宽度比例计算 */
  height?: number;
}

/** 根据屏幕宽度返回适配的 Banner 高度 */
function getBannerHeight(w: number): number {
  if (w >= 1024) return 400;
  if (w >= 768) return 320;
  if (w >= 600) return 280;
  return 200;
}

export function BannerListItem({ id, title, author, width, height }: BannerItemProps) {
  const { width: winWidth } = useWindowDimensions();
  const [loadError, setLoadError] = useState(false);

  const uri = BANNER_PREFIX + id + ".jpg";
  const containerWidth = width;
  const fixedHeight = height ?? getBannerHeight(winWidth);

  useEffect(() => {
    setLoadError(false);
    Image.getSize(
      uri,
      () => {},
      () => setLoadError(true)
    );
  }, [uri]);

  function handleLongPress() {
    if (Platform.OS === "web") {
      window.open(uri, "_blank");
    }
  }

  function handleTitlePress() {
    router.push(`/novel/${id}`);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.imageCard, { width: containerWidth, height: fixedHeight }]}
        onLongPress={handleLongPress}
      >
        {loadError ? (
          <View style={[styles.fallback, { width: containerWidth, height: fixedHeight }]}>
            <Text style={styles.fallbackText}>{title}</Text>
          </View>
        ) : (
          <View style={{ width: containerWidth, height: fixedHeight, overflow: "hidden", backgroundColor: "#1a1a1a" }}>
            <Image
              source={{ uri }}
              style={{
                position: "absolute",
                left: -containerWidth * 0.65,
                width: containerWidth * 1.65,
                height: fixedHeight,
              }}
              resizeMode="cover"
            />
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.textRow}
        onPress={handleTitlePress}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <ID id={id} />
        </View>
        {author && <Text style={styles.author} numberOfLines={1}>{author}</Text>}
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
    backgroundColor: Colors.surfaceBorder,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: "100%",
    height: "100%",
  },
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
    color: Colors.text,
    flex: 1,
  },
  author: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fallback: {
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  fallbackText: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.primary,
    textAlign: "center",
  },
  loading: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  lightbox: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.98)",
    justifyContent: "center",
    alignItems: "center",
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