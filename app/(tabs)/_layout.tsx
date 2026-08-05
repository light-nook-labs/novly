import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TAB_ICONS } from "../../constants/tabIcons";
import { useTheme } from "../../components/ThemeProvider";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surfaceBorder,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首页",
          tabBarIcon: ({ color, size }) => <Ionicons name={TAB_ICONS.home} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="novels"
        options={{
          title: "小说",
          tabBarIcon: ({ color, size }) => <Ionicons name={TAB_ICONS.novels} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="banners"
        options={{
          title: "背投",
          tabBarIcon: ({ color, size }) => <Ionicons name={TAB_ICONS.banners} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rankings"
        options={{
          title: "排行",
          tabBarIcon: ({ color, size }) => <Ionicons name={TAB_ICONS.rankings} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookshelf"
        options={{
          title: "书架",
          tabBarIcon: ({ color, size }) => <Ionicons name={TAB_ICONS.bookshelf} size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
