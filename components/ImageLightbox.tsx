import { useState, useRef } from "react";
import { Modal, Pressable, Image, TouchableOpacity, StyleSheet, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ICONS } from "../constants/icons";
import { useTheme } from "./ThemeProvider";

interface ImageLightboxProps {
  uri: string | null;
  children: React.ReactNode;
}

export function ImageLightbox({ uri, children }: ImageLightboxProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const downloadingRef = useRef(false);

  const handleDownload = async () => {
    if (!uri || downloadingRef.current) return;
    if (Platform.OS === "web") {
      const anchor = document.createElement("a");
      anchor.href = uri;
      anchor.download = `novly-${Date.now()}.jpg`;
      anchor.click();
      return;
    }
    downloadingRef.current = true;
    try {
      const FileSystem = await import("expo-file-system/legacy");
      const target = `${FileSystem.cacheDirectory ?? ""}novly-${Date.now()}.jpg`;
      const result = await FileSystem.downloadAsync(uri, target);
      try {
        const MediaLibrary = require("expo-media-library/legacy");
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(result.uri);
          Alert.alert("保存成功", "图片已保存到相册");
        }
      } catch {}
    } catch (error) {
      console.error("[ImageLightbox] download failed:", error);
    } finally {
      downloadingRef.current = false;
    }
  };

  return (
    <>
      <TouchableOpacity onPress={() => uri && setVisible(true)} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay + "FA" }]} onPress={() => setVisible(false)}>
          {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.overlayLight + "33" }]} onPress={() => setVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: colors.overlayLight + "33" }]} onPress={handleDownload} activeOpacity={0.7}>
            <Ionicons name={ICONS.download} size={24} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  downloadBtn: {
    position: "absolute",
    top: 100,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
