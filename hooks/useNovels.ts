import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "../utils/database";
import { type NovelRowData } from "../components/NovelRow";
import { buildNovelQuery } from "../utils/novelQuery";

interface UseNovelsOptions {
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

export function useNovels({
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
}: UseNovelsOptions = {}) {
  const [novels, setNovels] = useState<NovelRowData[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback(
    (pageNum: number) =>
      buildNovelQuery(pageNum, {
        ptype,
        status,
        genre,
        year,
        minWordNum,
        maxWordNum,
        sortBy,
        descending,
        pageSize,
        fromClause,
        extraWhere,
        extraParams,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的记忆化)
    [ptype, status, genre, year, minWordNum, maxWordNum, sortBy, descending, pageSize],
  );

  const loadPage = useCallback(
    async (pageNum: number, reset: boolean) => {
      const db = await getDatabase();
      const q = buildQuery(pageNum);

      try {
        const results = await db.getAllAsync<NovelRowData>(q.query, q.params);
        if (reset) {
          setNovels(results);
        } else {
          setNovels((prev) => [...prev, ...results]);
        }
        setPage(pageNum + 1);
        setHasMore(results.length === pageSize);
        setError(null);
      } catch (e) {
        console.error("Failed to load novels:", e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, pageSize],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 条件/排序变化时重置列表状态(有意为之)
    setLoading(true);
    setNovels([]);
    setPage(0);
    setHasMore(true);
    setError(null);
    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的条件变化执行)
  }, [ptype, status, genre, year, minWordNum, maxWordNum, sortBy, descending]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setLoading(true);
    loadPage(page, false);
  }, [hasMore, loading, page, loadPage]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    loadPage(0, true);
  }, [loadPage]);

  return { novels, loading, hasMore, loadMore, refresh, error };
}
