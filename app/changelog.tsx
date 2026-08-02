import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "../components/ThemeProvider";
import { PageHeader } from "../components/Header";
import { Spacing, FontSize } from "../constants/theme";

const CHANGELOG_TEXT = [
  "[1.0.3] - 2026-08-02",
  "### Fixed",
  "- 修复冷合并后 tag 路由查不到数据(CRITICAL)",
  "- 修复重启弹窗无法重启应用(MAJOR:改为重新挂载)",
  "- 修复初始化页面无状态栏(NORMAL)",
  "",
  "[1.0.2] - 2026-08-02",
  "### Added",
  "- 详情页(tag/contest/genre/status)完全对标 novels:复用 useNovels,列表/分页/过滤/count 统一",
  "- PtypeTabs 组件(head tabs:icon+label+count、水平滑动、防抖)",
  "- 详情页过滤功能(NovelFilterSheet)",
  "- LoadingScreen 美化(随机 tip + logo 动画)",
  "### Fixed",
  "- 修复详情页误显示不存在(loadXxx 参数/加载态混淆/tag.name 崩溃)",
  "- 修复 head tab count 不显示(loadCounts SQL)",
  "- 修复 search 上滑无 footer loading",
  "",
  "[1.0.1] - 2026-08-01",
  "### Fixed",
  "- 初始化:修复多页面并发 `getDatabase()` 导致重复初始化(重复解压/合并),initPromise 缓存",
  "- 冷合并:合并前清理残留文件(修复 malformed);并发锁防止 hotwarm 冲突;coldDb 绝对路径修复 ATTACH NPE",
  "- cold 合并分批执行(每批 5000 行 + 让出线程),初始化期间交互不卡死",
  "- 解压/写入分块平衡(1MB/2MB 频繁让出),初始化期间点击响应及时、避免点击堆积",
  "- 进度反馈:冷合并预处理阶段即显示进度条,不再长时间空白;日志带毫秒时间戳",
  "- head tab 防抖:激活 tab 点击忽略 + 1000ms 重复点击节流",
  "- welcome 弹窗倒计时改为基于时间戳计算,JS 线程占用时倒计时准确刷新",
  "- contest/tag 页上滑加载白屏转圈(loadNovels 补 finally setLoading(false))",
  "- settings/about 页版本号同步为 v1.0.1",
  "### Added",
  "- 首页/详情页/列表页 web 多列网格布局(3/2/1 列,tags 支持 6 列)",
  "- 书架 flexWrap 封面墙布局(固定高度/比例自适应)",
  "- settings 统计卡 2×2、危险区两列、ABOUT 链接两列;about Features 两列",
  "",
  "[1.0.0] - 2026-08-01",
  "### Added",
  "- 离线优先的轻小说元数据浏览器(数据内置 SQLite,无需网络)",
  "- 首页轮播(大屏自适应)、导航网格、热门排行",
  "- 多维列表:小说/排行/背投/作者/标签/比赛/分类/状态",
  "- 小说/作者详情、搜索、书架(收藏/过滤/排序)",
  "- 深色模式、主题切换",
  "- 初始化进度、欢迎弹窗、图片加载骨架屏",
  "- 桌面应用(Tauri v2,Windows NSIS 安装包,可自定义安装目录)",
].join("\n");

export default function ChangelogScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Changelog" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.text, { color: colors.textSecondary }]}>{CHANGELOG_TEXT}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  text: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
});
