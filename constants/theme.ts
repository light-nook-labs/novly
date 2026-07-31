export const lightColors = {
  primary: "#5B5FE9",
  primaryLight: "#5B5FE915",
  background: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceBorder: "#F0F1F5",
  border: "#E5E7EB",
  text: "#1A1A1A",
  textSecondary: "#666666",
  textTertiary: "#999999",
  textMuted: "#CCCCCC",
  danger: "#FF6B6B",
  success: "#4CAF50",
  info: "#2196F3",
  shadow: "#000000",
};

export const darkColors: typeof lightColors = {
  primary: "#8B8FF0",
  primaryLight: "#8B8FF022",
  background: "#121212",
  surface: "#1E1E1E",
  surfaceBorder: "#2A2A2A",
  border: "#3A3A3A",
  text: "#F5F5F5",
  textSecondary: "#B0B0B0",
  textTertiary: "#8A8A8A",
  textMuted: "#666666",
  danger: "#FF7A7A",
  success: "#66BB6A",
  info: "#4FC3F7",
  shadow: "#000000",
};

// 兼容现有组件：Colors 默认指向浅色方案
export const Colors = lightColors;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
};
