# Changelog

All notable changes to Novly are documented here.

## [1.2.1] - 2026-08-08

### Added

- 月榜独立路由页(`/monthly`):月份列表(搜索/加载更多/回到最新),首页导航第二行新增「月榜」入口;rankings 移除月榜 head tab(纯 DB 榜单)
- 在线数据本地缓存(24h TTL):月榜榜单、书单列表项、书单详情命中免重复请求,弱网可看旧数据
- 深链支持:Android 新增 `novly://` scheme 的 VIEW intent-filter(深链可直接打开对应路由)

### Improved

- 分页大小集中到 `constants/pagination.ts`(PAGE_SIZE),8 处本地定义统一
- 常用 SQL 封装为 `utils/sql.ts` 纯函数(计数/分组计数/排行榜/按 id 批量/完本推荐/banner/详情),消除重复手写 SQL,含 10 个单元测试

## [1.2.0] - 2026-08-08

### Added

- 萌神大赛独立路由页(`/moe`):按年份分组展示历年萌神小说(每年 2 本),首页导航入口
- 首页导航网格第二行:新增「书单」与「萌神」入口(书单不再为独立卡片,第二行不标注统计数)
- 首页「书单推荐」分区(完本推荐下方):从 1272 个在线书单中随机抽取 12 个,富样式行(id 标题/简介/创建者头像/VIP/收藏/推荐),每次加载随机变化
- 测试与质量基础设施:Jest 单元测试(46 个,覆盖数据映射/URL/月份生成/徽章颜色/月榜与书单 API 解析/萌神分组/SQL 构造/书架 DB)、GitHub Actions CI(推送自动跑 lint+test+tsc)、ESLint 冗余规则(lint 全绿)

### Fixed

- 修复渲染崩溃:ImageShimmer/Skeleton 重构为 useState 后未导入导致 ReferenceError(首页 banner、rankings 等含封面组件页面),补导入
- 书单列表/详情页缓存字段统一为 `data`(CacheEntry 泛型),导入路径修正

### Improved

- 书单 API 常量(BOOKLIST_API/EXPAND/KNOWN_TOTAL)集中到 `utils/booklistApi.ts`,列表页与首页推荐共用
- react-hooks warnings 消化(86→0):refs 改用 useState 惰性初始化、setState 渲染期调整、既有模式带理由 disable
- 在线 API 解析纯函数化(月榜 `utils/monthlyApi.ts`、书单 `utils/booklistApi.ts`)、萌神分组纯函数化(`utils/moe.ts`)、SQL 构造纯函数化(`utils/novelQuery.ts`)

## [1.1.0] - 2026-08-06

稳定版发布(自 1.1.0a/1.1.0b pre-release 正式转正)。

### Added

- 新增「月榜」功能:rankings 月榜 tab 展示月份列表(最早可追溯 2013-03),点击月份进入该月榜单页(月票榜/新书榜/热销榜/对话月票 head tabs,在线拉取 sfacg MonthlyBoy + 本地 DB 补元数据);月份列表支持手动加载更多、回到最新、yyyymm/yyyy 搜索
- 书单功能:在线书单列表/详情页(ID 搜索、手动加载更多、回到 #1、BackToTop)
- 主题系统:系统/浅色/深色三模式,全站页面与组件适配
- 首页:完本推荐说明弹层(InfoSheet)、书单入口、萌神大赛区块
- Settings:「Reinit」原地重新初始化数据(清除后自动重解压/合并,带进度显示,无需重启)

### Fixed

- 修复 ptype 数据错误:503 条 VIP 作品被标为"免费",已修复并重建 chunks
- 首页导航图标缺失(图标合并后复数键残留)
- 全站 badge 颜色统一:枚举(状态)与 tag 均绑定主题色,以 NovelRow 为准

### Improved

- APK 体积优化:164MB → 105MB(移除冗余 seed 打包与构建残留旧分块资产)
- 类型集中化(`types/models.ts`)、图标集中化(`constants/icons.ts`);AGENTS.md 拆分 `docs/` 独立文档

## [1.1.0b] - 2026-08-06

### Added

- 新增「月榜」功能:rankings 月榜 tab 展示月份列表(最早可追溯 2013-03),点击月份进入该月榜单页:
  - 月榜详情页 `monthly/[ym]`:head tabs 月票榜/新书榜/热销榜/对话月票(在线拉取 sfacg MonthlyBoy + 本地 DB 补元数据);旧月份分类不足 4 类时显示"该月暂无此榜单"
  - 月份列表:手动"加载更多"(每页 10 期)、"已是最后一期"提示、"回到最新"、支持 yyyymm/yyyy 搜索(年份为当年 12 月简写)
- 书单列表/详情页补充返回顶部(BackToTop)

### Fixed

- 修复 ptype 数据错误:503 条 VIP 作品被标为"免费"(以 novel_hub 首个 release 数据为基准修复,重建 chunks)

### Improved

- 数据管线脚本(`build_chunks.py`/`validators.py`/`fix_ptype.py`)迁移到 `scripts/` 并纳入版本管理,不再放 gitignore 的 temp/
- AGENTS.md/README 修正过期文件路径引用(`version.ts`→`appInfo.ts`、`AppInfoSheet`→`InfoSheet`/`NoteCard` 等)与项目结构

## [1.1.0a] - 2026-08-05

### Added

- 首页改版:「完本推荐」从完结A状态随机抽取 12 本(下拉刷新重新随机)+「萌神大赛」按年份分组展示(20xx萌神 tag)+ 完本推荐抽取逻辑说明 tip
- 新增「书单」浏览功能(SFACG 在线书单,需网络):
  - 列表页:在线分页加载(每页 10 条)+ 手动"加载更多"按钮 + 右上角正整数 ID 搜索(自行探索书单 id)
  - 详情页:书单信息 + 小说列表(封面/书名/作者/类型/系统标签/用户标签/字数/收藏/点击/书单主推荐理由)
- InfoSheet 通用底部说明弹层组件(settings/about 的 Why Novly 弹窗统一复用)

### Fixed

- 修复 about 页 `whyVisible` 未声明导致的运行时崩溃(补全半成品 Why Novly 弹窗)
- 移除状态枚举"下架"(7):该值在生成 db 时已被排除,永远不会有数据

### Improved

- NoteCard 全站统一(statuses 提示卡改用共享组件)
- authors 页提示卡与列表之间增加间距

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
