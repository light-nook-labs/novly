import { useState, useEffect, useCallback, useRef } from "react";
import { getDatabase } from "../utils/database";
import { type NovelRowData } from "../components/NovelRow";
import { buildNovelQuery } from "../utils/novelQuery";
import { PAGE_SIZE } from "../constants/pagination";

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
  pageSize = PAGE_SIZE,
  fromClause,
  extraWhere,
  extraParams,
}: UseNovelsOptions = {}) {
  const [novels, setNovels] = useState<NovelRowData[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 分页加载同步锁:FlatList 的 onLayout/onContentSizeChange/onEndReached 会连续触发 loadMore,
  // loading 状态异步生效无法阻止同一页面并发重复追加(导致重复 key),用 ref 同步锁防重
  const loadingRef = useRef(false);
  // page 的 ref 副本:避免 loadMore 闭包捕获过期 page 值导致同页重复追加
  const pageRef = useRef(0);

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
          setNovels((prev) => {
            const ids = new Set(prev.map((n) => n.id));
            const fresh = results.filter((r) => !ids.has(r.id));
            return [...prev, ...fresh];
          });
        }
        setPage(pageNum + 1);
        pageRef.current = pageNum + 1;
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
    pageRef.current = 0;
    loadingRef.current = true; // 阻止旧页 loadMore 追加到新列表
    setHasMore(true);
    setError(null);
    loadPage(0, true).finally(() => {
      loadingRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖已覆盖(有意的条件变化执行)
  }, [ptype, status, genre, year, minWordNum, maxWordNum, sortBy, descending]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    loadPage(pageRef.current, false).finally(() => {
      loadingRef.current = false;
    });
  }, [hasMore, loadPage]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    loadPage(0, true);
  }, [loadPage]);

  return { novels, loading, hasMore, loadMore, refresh, error };
}
