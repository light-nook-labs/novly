import { useState, useEffect, useRef } from "react";
import {
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  View,
  Platform,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ID } from "./ID";
import { FontSize, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "./ThemeProvider";

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

/** 根据容器宽度返回适配的 Banner 高度(宽高比 > 2:1,保持图片截取逻辑不变) */
function getBannerHeight(w: number): number {
  if (w >= 1024) return 400;
  if (w >= 768) return 320;
  if (w >= 600) return 280;
  return Math.round(w * 0.45);
}

export function BannerListItem({ id, title, author, width, height }: BannerItemProps) {
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const uri = BANNER_PREFIX + id + ".jpg";
  const containerWidth = width;
  const fixedHeight = height ?? getBannerHeight(containerWidth);

  useEffect(() => {
    setLoaded(false);
    setLoadError(false);
    Image.getSize(
      uri,
      () => setLoaded(true),
      () => { setLoadError(true); setLoaded(true); }
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
        style={[styles.imageCard, { width: containerWidth, height: fixedHeight, backgroundColor: colors.surfaceBorder }]}
        onPress={() => setShowLightbox(true)}
        onLongPress={handleLongPress}
      >
        {loadError ? (
          <View style={[styles.fallback, { width: containerWidth, height: fixedHeight, backgroundColor: colors.surface }]}>
            <Text style={[styles.fallbackText, { color: colors.primary }]}>{title}</Text>
          </View>
        ) : !loaded ? (
          <Animated.View
            style={[
              styles.placeholder,
              { width: containerWidth, height: fixedHeight, opacity: pulseAnim, backgroundColor: colors.surfaceBorder },
            ]}
          />
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

      {/* Lightbox */}
      <Modal visible={showLightbox} transparent animationType="fade" onRequestClose={() => setShowLightbox(false)}>
        <Pressable style={styles.lightbox} onPress={() => setShowLightbox(false)}>
          <Image source={{ uri }} style={styles.lightboxImage} resizeMode="contain" />
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setShowLightbox(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.textRow}
        onPress={handleTitlePress}
      >
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
          <ID id={id} weight="700" />
        </View>
        {author && <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>{author}</Text>}
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
