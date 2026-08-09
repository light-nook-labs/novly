// 本地智能推荐测试(已注释,2026-08-09)
// 推荐机制不科学(热度兜底导致榜单前列恒被推荐),utils/recommend.ts 已注释;
// 待 nookdata 补充书籍简介/作者简介等数据后做 NLP/机器学习,再恢复本测试。
// import { describe, expect, it } from "@jest/globals";
// import type { NovelRowData } from "../components/NovelRow";
// import {
//   scoreSimilarity,
//   pickSimilar,
//   scorePreference,
//   pickForYou,
//   buildPreferences,
// } from "../utils/recommend";

// function novel(id: number, genre: number, click = 100): NovelRowData {
//   return {
//     id,
//     title: `小说${id}`,
//     author: null,
//     cover: null,
//     click_num: click,
//     status: 3,
//     genre,
//     ptype: 2,
//   };
// }

// describe("scoreSimilarity", () => {
//   it("同 genre +3,共享 tag 每个 +1", () => {
//     expect(scoreSimilarity(3, ["a", "b"], 3, ["b", "c"])).toBe(4);
//     expect(scoreSimilarity(3, ["a"], 5, ["a"])).toBe(1);
//     expect(scoreSimilarity(3, ["a"], 5, ["x"])).toBe(0);
//   });
// });

// describe("pickSimilar", () => {
//   it("按分数降序,同分按热度降序,排除目标,过滤无关,取 topN", () => {
//     const candidates = [
//       { novel: novel(1, 3), tags: ["a"] }, // 排除目标(id=1)
//       { novel: novel(2, 3, 500), tags: ["a"] }, // 同 genre + 同 tag: 4
//       { novel: novel(3, 9), tags: ["x"] }, // 无关: 0 → 过滤
//       { novel: novel(4, 5), tags: ["a", "b"] }, // 仅共享 tag a: 1
//     ];
//     const picked = pickSimilar(candidates, 3, ["a"], 1, 2);
//     expect(picked.map((p) => p.novel.id)).toEqual([2, 4]);
//     expect(picked[0].score).toBe(4);
//   });
// });

// describe("scorePreference", () => {
//   it("命中偏好 genre +5,偏好 tag 每个 +2", () => {
//     const prefs = { genres: new Set([3]), tags: new Set(["a"]) };
//     expect(scorePreference(prefs, 3, ["a", "b"])).toBe(7);
//     expect(scorePreference(prefs, 9, ["x"])).toBe(0);
//   });
// });

// describe("pickForYou", () => {
//   it("按偏好分数降序,过滤无关,取 topN", () => {
//     const candidates = [
//       { novel: novel(1, 3, 300), tags: ["a"] }, // 5+2=7
//       { novel: novel(2, 3), tags: [] }, // 5
//       { novel: novel(3, 9), tags: ["x"] }, // 0 → 过滤
//     ];
//     const picked = pickForYou(candidates, { genres: new Set([3]), tags: new Set(["a"]) }, 2);
//     expect(picked.map((p) => p.novel.id)).toEqual([1, 2]);
//   });
// });

// describe("buildPreferences", () => {
//   it("取出现最多的 genre top3 与 tag top6", () => {
//     const shelf = [
//       { id: 1, genre: 3 },
//       { id: 2, genre: 3 },
//       { id: 3, genre: 5 },
//       { id: 4, genre: 5 },
//       { id: 5, genre: 5 },
//     ];
//     const shelfTags = [
//       { novelId: 1, tags: ["a", "b"] },
//       { novelId: 2, tags: ["a", "c"] },
//     ];
//     const prefs = buildPreferences(shelf, shelfTags);
//     expect(prefs.genres.has(5)).toBe(true); // 出现 3 次最多
//     expect(prefs.genres.has(3)).toBe(true);
//     expect(prefs.tags.has("a")).toBe(true); // 出现 2 次最多
//   });
// });

import { describe, expect, it } from "@jest/globals";

describe("本地智能推荐(已注释)", () => {
  it("推荐功能已注释,待 nookdata 补充数据后做 NLP/机器学习再恢复", () => {
    expect(true).toBe(true);
  });
});
