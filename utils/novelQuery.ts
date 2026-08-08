// useNovels 的 SQL 查询构造(纯函数,可单元测试)
export interface NovelQueryOptions {
  ptype?: number | null;
  status?: number | null;
  genre?: number | null;
  year?: number | null;
  minWordNum?: number | null;
  maxWordNum?: number | null;
  sortBy?: string;
  descending?: boolean;
  pageSize?: number;
  /** 自定义 FROM/JOIN 子句(详情页复用,如 tag 的 INNER JOIN) */
  fromClause?: string;
  /** 额外固定条件(如 ["nt.tag_id = ?"]) */
  extraWhere?: string[];
  /** 额外条件参数 */
  extraParams?: any[];
}

const SORT_WHITELIST = new Set(["click_num", "word_num", "like_num", "praise_num", "last_update"]);

// 构造分页查询:过滤条件(白名单排序)+ LIMIT/OFFSET
export function buildNovelQuery(pageNum: number, options: NovelQueryOptions): { query: string; params: any[] } {
  const {
    ptype = null,
    status = null,
    genre = null,
    year = null,
    minWordNum = null,
    maxWordNum = null,
    sortBy = "click_num",
    descending = true,
    pageSize = 10,
    fromClause,
    extraWhere,
    extraParams,
  } = options;

  let query = `SELECT id, title, author, cover, click_num, word_num, status, genre, ptype ${fromClause ?? "FROM novels"}`;
  const conditions: string[] = [...(extraWhere ?? [])];
  const params: any[] = [...(extraParams ?? [])];

  if (ptype !== null) {
    conditions.push("ptype = ?");
    params.push(ptype);
  }
  if (status !== null) {
    conditions.push("status = ?");
    params.push(status);
  }
  if (genre !== null) {
    conditions.push("genre = ?");
    params.push(genre);
  }
  if (year !== null) {
    conditions.push("SUBSTR(last_update, 1, 4) = ?");
    params.push(String(year));
  }
  if (minWordNum !== null) {
    conditions.push("word_num >= ?");
    params.push(minWordNum);
  }
  if (maxWordNum !== null) {
    conditions.push("word_num < ?");
    params.push(maxWordNum);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  const orderField = SORT_WHITELIST.has(sortBy) ? sortBy : "click_num";
  query += ` ORDER BY ${orderField} ${descending ? "DESC" : "ASC"} LIMIT ? OFFSET ?`;
  params.push(pageSize, pageNum * pageSize);

  return { query, params };
}
