# Changelog

All notable changes to Novly are documented here.

## [1.0.3] - 2026-08-02

### Fixed

- 修复冷合并后 tag 路由查不到数据(CRITICAL:useNovels 每次取最新 currentDb,重启后正常)
- 修复重启弹窗无法重启应用(MAJOR:DevSettings.reload release 无效 → 重新挂载组件树)
- 修复初始化页面无状态栏(NORMAL:wifi/蓝牙/消息图标不显示)

### Added
- 类型统一管理:types/models.ts(Author/Contest/Novel),渐进式迁移(见 TYPE_MIGRATION.md)
- app 元信息统一常量 constants/appInfo.ts(名称/作者/GH/QQ/邮箱/版本/标语/许可证)
- LoadingScreen 初始化进度条 + 耐心等待提示

### Fixed
- 修复详情页 head tab 切换整页替换(对齐 novels:只更新内容区)
- 修复 NovelRow 点赞数字截断(安卓 CJK 修法)
- 修复 settings Linking 命名冲突(统一 expo-linking)

### Refactored
- Changelog 改为跳转 GitHub CHANGELOG.md(删除 app 内 changelog 页面/路由,零维护)
- 统一版本号与元信息管理(version.ts 并入 appInfo.ts)

## [1.0.2] - 2026-08-02

### Added

- 详情页(tag/contest/genre/status)完全对标 novels:复用 useNovels hook,列表/分页/过滤/count 统一
- PtypeTabs 组件(head tabs:icon+label+count、水平滑动、防抖),novels 与详情页复用
- 详情页过滤功能(NovelFilterSheet:genre/status/年份/字数)
- LoadingScreen 美化(随机 tip 起点 + logo 缩放动画)

### Fixed

- 修复详情页"标签/赛事不存在"误显示(loadXxx 参数、加载态混淆、tag.name 崩溃)
- 修复 head tab count 不显示(loadCounts GROUP BY SQL 语法错误)
- 修复详情页/列表页 loading 位置(整页 → footer)、重复 key 警告
- 修复 search 上滑加载无 footer loading

### Improved

- 初始化:cold 准备阶段移到 Loading 期间、分块平衡、100ms 让出,交互流畅
- 配置 Prettier 代码格式化工具

### Added(补充)

- 冷合并完成后弹窗提示重启应用(防页面数据未及时更新)
- LoadingScreen:版本号/平台、By Light Nook Labs 组织信息、页脚许可/版权/GitHub URL、logo/tip 居中、转圈位置

### Fixed(补充)

- 修复 LoadingScreen 裸文本错误(`</View>` 与 `<View>` 同行空格被 React 当作文本)
- 修复 LoadingScreen 文字截断(安卓 CJK 修法)、版本行/页脚截断
- 修复 head tab 高度异常(占 1/3 屏幕)与列表重叠(FlatList flex 1)
- 修复 tag/contest loadXxx 参数误加、加载态混淆(误显示"不存在")

## [1.0.1] - 2026-08-01

### Fixed

- 初始化:修复多页面并发 `getDatabase()` 导致重复初始化(重复解压/合并),initPromise 缓存
- 冷合并:合并前清理残留文件(修复 malformed);并发锁防止 hotwarm 冲突;coldDb 绝对路径修复 ATTACH NPE
- cold 合并分批执行(每批 5000 行 + 让出线程),初始化期间交互不卡死
- 解压/写入分块平衡(1MB/2MB 频繁让出),初始化期间点击响应及时、避免点击堆积
- 进度反馈:冷合并预处理阶段即显示进度条,不再长时间空白;日志带毫秒时间戳
- head tab 防抖:激活 tab 点击忽略 + 1000ms 重复点击节流
- welcome 弹窗倒计时改为基于时间戳计算,JS 线程占用时倒计时准确刷新
- contest/tag 页上滑加载白屏转圈(loadNovels 补 finally setLoading(false))
- settings/about 页版本号同步为 v1.0.1

### Added

- 首页/详情页/列表页 web 多列网格布局(3/2/1 列,tags 支持 6 列)
- 书架 flexWrap 封面墙布局(固定高度/比例自适应)
- settings 统计卡 2×2、危险区两列、ABOUT 链接两列;about Features 两列

## [1.0.0] - 2026-08-01

### Added

- 离线优先的轻小说元数据浏览器(数据内置 SQLite,无需网络)
- 首页轮播(大屏自适应)、导航网格、热门排行
- 多维列表:小说/排行/背投/作者/标签/比赛/分类/状态
- 小说/作者详情、搜索、书架(收藏/过滤/排序)
- 深色模式、主题切换
- 初始化进度、欢迎弹窗、图片加载骨架屏
- 桌面应用(Tauri v2,Windows NSIS 安装包,可自定义安装目录)
