// 版本更新检查:从 GitHub Releases 拉取最新版本(纯函数可测)
import { APP_GITHUB_ORG, APP_GITHUB_REPO } from "../constants/appInfo";

export interface ReleaseInfo {
  tagName: string;
  name: string;
  body: string | null;
  publishedAt: string | null;
}

// 拉取最新 release(GitHub API,无需鉴权)
export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const res = await fetch(
    `https://api.github.com/repos/${APP_GITHUB_ORG}/${APP_GITHUB_REPO}/releases/latest`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return {
    tagName: String(json.tag_name ?? ""),
    name: String(json.name ?? ""),
    body: typeof json.body === "string" ? json.body : null,
    publishedAt: typeof json.published_at === "string" ? json.published_at : null,
  };
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
