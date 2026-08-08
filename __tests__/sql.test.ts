import { describe, expect, it } from "@jest/globals";
import {
  buildCountQuery,
  buildGroupCountQuery,
  buildRankingsQuery,
  buildNovelsByIdsQuery,
  buildRandomCompletedQuery,
  buildBannerQuery,
  NOVEL_DETAIL_QUERY,
} from "../utils/sql";

describe("SQL 构建函数", () => {
  it("buildCountQuery:无 WHERE", () => {
    expect(buildCountQuery("authors")).toBe("SELECT COUNT(*) as v FROM authors");
  });

  it("buildCountQuery:带 WHERE", () => {
    expect(buildCountQuery("novels", "status = 2")).toBe(
      "SELECT COUNT(*) as v FROM novels WHERE status = 2",
    );
  });

  it("buildGroupCountQuery:分组计数", () => {
    expect(buildGroupCountQuery("novels", "ptype", "genre = 3")).toBe(
      "SELECT ptype, COUNT(*) as v FROM novels WHERE genre = 3 GROUP BY ptype",
    );
  });

  it("buildGroupCountQuery:自定义别名与排序", () => {
    expect(buildGroupCountQuery("novels", "genre", undefined, "v DESC", "count")).toBe(
      "SELECT genre, COUNT(*) as count FROM novels GROUP BY genre ORDER BY v DESC",
    );
  });

  it("buildRankingsQuery:字段条件与分页参数", () => {
    const { query, params } = buildRankingsQuery("click_num", 10, 20);
    expect(query).toContain("WHERE click_num > 0");
    expect(query).toContain("ORDER BY click_num DESC");
    expect(query).toContain("LIMIT ? OFFSET ?");
    expect(params).toEqual([10, 20]);
  });

  it("buildNovelsByIdsQuery:IN 占位与参数", () => {
    const { query, params } = buildNovelsByIdsQuery([1, 2, 3]);
    expect(query).toContain("WHERE id IN (?,?,?)");
    expect(params).toEqual([1, 2, 3]);
  });

  it("buildNovelsByIdsQuery:自定义列", () => {
    const { query } = buildNovelsByIdsQuery([7], "id, title, author");
    expect(query).toContain("SELECT id, title, author FROM novels");
  });

  it("buildRandomCompletedQuery:完结随机", () => {
    const { query, params } = buildRandomCompletedQuery(12);
    expect(query).toContain("WHERE status = 6");
    expect(query).toContain("ORDER BY RANDOM()");
    expect(params).toEqual([12]);
  });

  it("buildBannerQuery:banner 查询", () => {
    const { query, params } = buildBannerQuery(6);
    expect(query).toContain("WHERE has_banner = 1");
    expect(params).toEqual([6]);
  });

  it("NOVEL_DETAIL_QUERY:详情查询", () => {
    expect(NOVEL_DETAIL_QUERY).toBe("SELECT * FROM novels WHERE id = ?");
  });
});
