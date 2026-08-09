import { useState } from "react";
import { Modal, Pressable, Image, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ICONS } from "../constants/icons";

interface ImageLightboxProps {
  uri: string | null;
  children: React.ReactNode;
}

export function ImageLightbox({ uri, children }: ImageLightboxProps) {
  const [visible, setVisible] = useState(false);

  // 下载图片:web 直接触发下载链接;原生下载到缓存后调起分享面板(可保存到相册/其他应用)
  const handleDownload = async () => {
    if (!uri) return;
    if (Platform.OS === "web") {
      const anchor = document.createElement("a");
      anchor.href = uri;
      anchor.download = `novly-${Date.now()}.jpg`;
      anchor.click();
      return;
    }
    try {
      const FileSystem = await import("expo-file-system/legacy");
      const Sharing = await import("expo-sharing");
      const target = `${FileSystem.cacheDirectory ?? ""}novly-${Date.now()}.jpg`;
      const result = await FileSystem.downloadAsync(uri, target);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      }
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={() => uri && setVisible(true)} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.7}>
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
    backgroundColor: "rgba(0,0,0,0.98)",
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
    backgroundColor: "rgba(255,255,255,0.2)",
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
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});
