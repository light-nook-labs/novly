// 本地智能推荐(已注释,2026-08-09)
// 原因:推荐机制不科学——热度(click_num)作为兜底排序键,导致高数据量书籍恒被推荐,
// 被推荐的永远是 rank 各榜单前列的书籍,无法实现科学推荐。
// 保留代码供未来科学方案参考(如去热度偏差的加权抽样、基于用户行为的个性化建模)。
/*
import type { NovelRowData } from "../types/models";

export interface RecommendItem {
  novel: NovelRowData;
  score: number;
}

// 相似度打分:同 genre +3,共享 tag 每个 +1
export function scoreSimilarity(
  targetGenre: number,
  targetTags: string[],
  candidateGenre: number,
  candidateTags: string[],
): number {
  let score = 0;
  if (targetGenre === candidateGenre) score += 3;
  const targetSet = new Set(targetTags);
  for (const tag of candidateTags) {
    if (targetSet.has(tag)) score += 1;
  }
  return score;
}

// 从候选中挑选相似推荐:分数降序(仅保留有关联的 score > 0),同分按热度降序,排除 excludedId,取 topN
export function pickSimilar(
  candidates: { novel: NovelRowData; tags: string[] }[],
  targetGenre: number,
  targetTags: string[],
  excludedId: number,
  topN: number,
): RecommendItem[] {
  return candidates
    .filter((c) => c.novel.id !== excludedId)
    .map((c) => ({ novel: c.novel, score: scoreSimilarity(targetGenre, targetTags, c.novel.genre, c.tags) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || (b.novel.click_num ?? 0) - (a.novel.click_num ?? 0))
    .slice(0, topN);
}

// 个性化偏好打分:命中偏好 genre +5,命中偏好 tag 每个 +2
export function scorePreference(
  prefs: { genres: Set<number>; tags: Set<string> },
  candidateGenre: number,
  candidateTags: string[],
): number {
  let score = 0;
  if (prefs.genres.has(candidateGenre)) score += 5;
  for (const tag of candidateTags) {
    if (prefs.tags.has(tag)) score += 2;
  }
  return score;
}

// 从候选中挑选个性化推荐:按偏好分数降序(仅保留有关联的 score > 0),同分按热度降序,取 topN
export function pickForYou(
  candidates: { novel: NovelRowData; tags: string[] }[],
  prefs: { genres: Set<number>; tags: Set<string> },
  topN: number,
): RecommendItem[] {
  return candidates
    .map((c) => ({ novel: c.novel, score: scorePreference(prefs, c.novel.genre, c.tags) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || (b.novel.click_num ?? 0) - (a.novel.click_num ?? 0))
    .slice(0, topN);
}

// 从书架小说中聚合偏好(genre 计数 + tag 计数,取 top 各若干)
export function buildPreferences(
  bookshelf: { id: number; genre: number }[],
  shelfTags: { novelId: number; tags: string[] }[],
): { genres: Set<number>; tags: Set<string> } {
  const genreCount = new Map<number, number>();
  const tagCount = new Map<string, number>();
  const tagByNovel = new Map(shelfTags.map((s) => [s.novelId, s.tags]));
  for (const novel of bookshelf) {
    genreCount.set(novel.genre, (genreCount.get(novel.genre) ?? 0) + 1);
    for (const tag of tagByNovel.get(novel.id) ?? []) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
  }
  const genres = new Set(
    [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g),
  );
  const tags = new Set(
    [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t),
  );
  return { genres, tags };
}
*/
