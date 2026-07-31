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
// 每行最大宽度:9 个汉字(1 个汉字 ≈ 2 个 ascii 字符)
const LINE_MAX_WIDTH = 18;
const MAX_LINES = 3;

/** 全角/汉字宽度计 2,ASCII 计 1 */
function charWidth(ch: string): number {
  const code = ch.charCodeAt(0);
  if (
    code === 0x3000 ||
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xa000 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  ) {
    return 2;
  }
  return 1;
}

function textWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += charWidth(ch);
  return w;
}

/** 字母/数字视为单词字符,换行时不拆分单词 */
function isWordChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

/**
 * 将 title#id 按宽度强制换行(每行最多 9 个汉字),最多 3 行;
 * 英文单词不被拆开(要么提早换行,要么推迟换行);
 * #id 作为一个整体不可被拆到两行。
 */
function formatBannerText(title: string, id: number): string {
  const idText = ` #${id}`;
  const lines: string[] = [];
  let line = "";
  let width = 0;

  for (let i = 0; i < title.length; i++) {
    const ch = title[i];
    const w = charWidth(ch);
    if (width + w > LINE_MAX_WIDTH && line.length > 0) {
      // 处于英文单词中间(行尾与当前字符都是单词字符)时,
      // 回退到最近空格处换行,把单词剩余部分推到下一行(推迟换行)
      if (isWordChar(ch) && isWordChar(line[line.length - 1])) {
        const lastSpace = line.lastIndexOf(" ");
        if (lastSpace > 0) {
          const overflow = line.slice(lastSpace + 1);
          lines.push(line.slice(0, lastSpace));
          line = overflow;
          width = textWidth(overflow);
          continue; // 重新评估当前字符(单词已移到行首)
        }
      }
      lines.push(line);
      line = "";
      width = 0;
    }
    line += ch;
    width += w;
  }

  // #id 整体附加:当前行放得下就续行,放不下则另起一行
  const idW = textWidth(idText);
  if (line.length > 0 && width + idW > LINE_MAX_WIDTH) {
    lines.push(line);
    line = "";
    width = 0;
  }
  line += idText;
  width += idW;
  lines.push(line);

  return lines.slice(0, MAX_LINES).join("\n");
}

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

  const fixedHeight = height ?? containerWidth * 0.45;

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
              left: -containerWidth * 0.45,
              width: containerWidth * 1.45,
              height: fixedHeight,
            }}
            resizeMode="cover"
          />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={MAX_LINES}>{formatBannerText(title, id)}</Text>
        {author && <Text style={[styles.title, styles.author]} numberOfLines={1}>{author}</Text>}
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
  author: {
    fontSize: FontSize.md,
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
    alignSelf: "stretch",
  },
});
