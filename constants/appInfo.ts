// App 元信息统一常量:名称/作者/GH/联系方式/版本/标语/许可证等
// app 元信息变更时只需改这一处,各页面展示均引用它
import { ICONS } from "./icons";

// 版本号(统一管理,发布时只改这一处)
export const APP_VERSION = "1.2.2";

export const APP_NAME = "Novly";
export const APP_SLOGAN = "离线优先的轻小说元数据浏览器";
export const APP_SLOGAN_EN = "Offline-first browser for novel metadata";

// About 页特性列表(功能迭代时改这里,icon 用 ICONS 语义键)
export const APP_FEATURES: { icon: (typeof ICONS)[keyof typeof ICONS]; title: string; desc: string }[] = [
  {
    icon: ICONS.offline,
    title: "Offline-first",
    desc: "All novel metadata is bundled and browsable without network",
  },
  {
    icon: ICONS.library,
    title: "Full Library",
    desc: "Browse and filter by genre, status, contest and tags",
  },
  {
    icon: ICONS.search,
    title: "Instant Search",
    desc: "Search globally by title, author or ID with instant response",
  },
  {
    icon: ICONS.podium,
    title: "Multi Rankings",
    desc: "Clicks, words, favorites, praises, reviews and more",
  },
  {
    icon: ICONS.bookmark,
    title: "Local Bookshelf",
    desc: "Bookshelf stored in a private local database, persistent",
  },
  {
    icon: ICONS.link,
    title: "Open in SFACG",
    desc: "Jump to the SFACG app or website to read the original",
  },
];

// About 页技术栈(依赖升级时改这里)
export const APP_STACK = ["React Native", "Expo SDK 57", "TypeScript", "expo-sqlite"];

export const APP_AUTHOR = "Light Nook Labs";
export const APP_GITHUB_ORG = "light-nook-labs";
export const APP_GITHUB_REPO = "novly";
export const APP_GITHUB_URL = `https://github.com/${APP_GITHUB_ORG}/${APP_GITHUB_REPO}`;

export const APP_QQ_GROUP = "881041631";
export const APP_EMAIL = "intersetwq@gmail.com";

// 常用 URL(基于 APP_GITHUB_URL 派生,避免各页面硬编码)
export const APP_ISSUES_URL = `${APP_GITHUB_URL}/issues`;
export const APP_LICENSE_URL = `${APP_GITHUB_URL}/blob/master/LICENSE`;
export const APP_CHANGELOG_URL = `${APP_GITHUB_URL}/blob/main/CHANGELOG.md`;
// 上游数据源与兄弟项目
export const APP_NOVEL_HUB_URL = "https://github.com/light-nook-labs/novel_hub";
export const APP_NOVEL_HUB_MOBILE_URL = "https://github.com/light-nook-labs/NovelHubMobile";

// 从完整 GitHub url 提取 owner/repo 短格式(界面显示用,如 "light-nook-labs/novly")
export function ghShortUrl(url: string): string {
  return url.replace(/^https:\/\/github\.com\//, "");
}

export const APP_LICENSE = "MIT";
export const APP_COPYRIGHT_YEAR = "2026";
export const APP_COPYRIGHT = `© ${APP_COPYRIGHT_YEAR} ${APP_AUTHOR}`;
export const APP_FOOTER = `${APP_LICENSE} License · ${APP_COPYRIGHT}`;
