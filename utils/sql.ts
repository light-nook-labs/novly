// 常用 SQL 构建函数(纯函数,集中管理 SQL 字符串,避免各处手写)
// 注意:表名/字段名由调用方显式传入(均来自代码内常量),值一律用 ? 占位参数

// 计数查询:SELECT COUNT(*) as v FROM <table> [WHERE <where>]
export function buildCountQuery(table: string, where?: string): string {
  return `SELECT COUNT(*) as v FROM ${table}${where ? ` WHERE ${where}` : ""}`;
}

// 分组计数:SELECT <groupField>, COUNT(*) as <alias> FROM <table> [WHERE <where>] GROUP BY <groupField> [ORDER BY <orderBy>]
export function buildGroupCountQuery(
  table: string,
  groupField: string,
  where?: string,
  orderBy?: string,
  alias = "v",
): string {
  return `SELECT ${groupField}, COUNT(*) as ${alias} FROM ${table}${where ? ` WHERE ${where}` : ""} GROUP BY ${groupField}${
    orderBy ? ` ORDER BY ${orderBy}` : ""
  }`;
}

// 排行榜查询:某数字字段 > 0,按该字段降序分页
export function buildRankingsQuery(
  field: string,
  limit: number,
  offset: number,
): { query: string; params: number[] } {
  return {
    query: `SELECT id, title, author, genre, status, ptype, word_num, click_num, like_num, praise_num, review_num, comment_num, cover, contest_id, has_banner, last_update
     FROM novels
     WHERE ${field} > 0
     ORDER BY ${field} DESC
     LIMIT ? OFFSET ?`,
    params: [limit, offset],
  };
}

// 按 id 批量查询小说(在线数据补充本地元数据)
export function buildNovelsByIdsQuery(
  ids: number[],
  columns = "id, title, author, genre, status, ptype, cover",
): { query: string; params: number[] } {
  const placeholders = ids.map(() => "?").join(",");
  return {
    query: `SELECT ${columns} FROM novels WHERE id IN (${placeholders})`,
    params: ids,
  };
}

// banner 小说(has_banner = 1)
export function buildBannerQuery(limit: number): { query: string; params: number[] } {
  return {
    query: "SELECT id, title, author FROM novels WHERE has_banner = 1 ORDER BY click_num DESC LIMIT ?",
    params: [limit],
  };
}

// 完本推荐:完结(status=6)随机抽 N 本
export function buildRandomCompletedQuery(limit: number): { query: string; params: number[] } {
  return {
    query:
      "SELECT id, title, author, cover, click_num, status, genre, ptype FROM novels WHERE status = 6 ORDER BY RANDOM() LIMIT ?",
    params: [limit],
  };
}

// 小说详情
export const NOVEL_DETAIL_QUERY = "SELECT * FROM novels WHERE id = ?";
