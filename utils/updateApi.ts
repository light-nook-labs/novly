// 版本更新检查:从 GitHub Releases 拉取最新版本(直连优先,失败自动回退加速镜像)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_GITHUB_ORG, APP_GITHUB_REPO, APP_GITHUB_URL } from "../constants/appInfo";

export interface ReleaseInfo {
  tagName: string;
  name: string;
  body: string | null;
  publishedAt: string | null;
  /** 最新版本资产下载 URL(如 APK 的 browser_download_url) */
  downloadUrl: string | null;
}

// GitHub 加速镜像(前缀代理形式:https://<mirror>/https://github.com/... 或 api.github.com/...)
const MIRROR_PROXIES = [
  "https://ghfast.top/",
  "https://mirror.ghproxy.com/",
  "https://gh-proxy.com/",
  "https://ghproxy.net/",
];

const API_URL = `https://api.github.com/repos/${APP_GITHUB_ORG}/${APP_GITHUB_REPO}/releases/latest`;

const CACHE_KEY = "novly_update_check";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 检查结果缓存 24h(红点跨会话持久,免每次进入都请求)

export interface UpdateCacheEntry {
  timestamp: number;
  latestTag: string;
  downloadUrl: string | null;
}

// 带超时的 fetch(超时中止,避免弱网长时间挂起)
async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

// 测量单个镜像延迟(请求仓库首页,失败返回 Infinity)
async function measureMirror(mirror: string): Promise<number> {
  const start = Date.now();
  try {
    await fetchWithTimeout(`${mirror}https://github.com/${APP_GITHUB_ORG}/${APP_GITHUB_REPO}`, 4000);
    return Date.now() - start;
  } catch {
    return Infinity;
  }
}

// 检测最快的可用镜像(全部不可用返回 null)
export async function detectFastestMirror(): Promise<string | null> {
  const results = await Promise.all(MIRROR_PROXIES.map(async (m) => ({ m, ms: await measureMirror(m) })));
  const ok = results.filter((r) => r.ms !== Infinity).sort((a, b) => a.ms - b.ms);
  return ok.length > 0 ? ok[0].m : null;
}

// 拉取最新 release:直连优先,失败依次回退镜像代理
export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  let json: any = null;
  try {
    const res = await fetchWithTimeout(API_URL);
    if (res.ok) json = await res.json();
  } catch {
    json = null;
  }
  if (!json) {
    for (const mirror of MIRROR_PROXIES) {
      try {
        const res = await fetchWithTimeout(`${mirror}${API_URL}`);
        if (res.ok) {
          json = await res.json();
          break;
        }
      } catch {
        // 该镜像不可用,尝试下一个
      }
    }
  }
  if (!json) return null;
  const asset = Array.isArray(json.assets) ? json.assets[0] : null;
  return {
    tagName: String(json.tag_name ?? ""),
    name: String(json.name ?? ""),
    body: typeof json.body === "string" ? json.body : null,
    publishedAt: typeof json.published_at === "string" ? json.published_at : null,
    downloadUrl: asset && typeof asset.browser_download_url === "string" ? asset.browser_download_url : null,
  };
}

// 读取缓存的检查结果(过期返回 null)
export async function getCachedUpdate(): Promise<UpdateCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: UpdateCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry;
  } catch {
    return null;
  }
}

export async function setCachedUpdate(entry: UpdateCacheEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // 缓存失败不影响主流程
  }
}

// 构造下载 URL:有可用镜像则用镜像代理资产下载,否则回退直连资产/release 页
export function buildDownloadUrl(mirror: string | null, downloadUrl: string | null, tagName: string): string {
  if (downloadUrl) {
    return mirror ? `${mirror}${downloadUrl}` : downloadUrl;
  }
  return `${APP_GITHUB_URL}/releases/tag/${tagName}`;
}

// 比较语义化版本("1.2.1" vs "v1.2.0"):a > b 返回正数,a < b 返回负数
// 忽略 v 前缀与 pre-release 后缀(a/b 视为低于正式版同段号)
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): number[] => {
    const core = v.trim().replace(/^v/i, "").replace(/[a-z].*$/i, ""); // 去掉 v 前缀与字母后缀
    const parts = core.split(".").map((n) => Number.parseInt(n, 10) || 0);
    while (parts.length < 3) parts.push(0);
    return parts;
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
