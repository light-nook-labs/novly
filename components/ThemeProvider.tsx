import { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { lightColors, darkColors } from "../constants/theme";

export type ThemeMode = "system" | "light" | "dark";

export type ThemeColors = typeof lightColors;

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "theme_mode";

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  colors: lightColors,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const effective = mode === "system"
    ? (systemScheme === "dark" ? "dark" : "light")
    : mode;
  const colors = effective === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
