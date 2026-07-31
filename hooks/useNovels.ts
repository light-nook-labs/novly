import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "../utils/database";
import { type NovelRowData } from "../components/NovelRow";

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
}

const SORT_WHITELIST = new Set([
  "click_num",
  "word_num",
  "like_num",
  "praise_num",
  "last_update",
]);

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
}: UseNovelsOptions = {}) {
  const [novels, setNovels] = useState<NovelRowData[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const buildQuery = useCallback(
    (pageNum: number) => {
      let query =
        "SELECT id, title, author, cover, click_num, word_num, status, genre, ptype FROM novels";
      const conditions: string[] = [];
      const params: any[] = [];

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
    },
    [ptype, status, genre, year, minWordNum, maxWordNum, sortBy, descending, pageSize]
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
      } catch (e) {
        console.error("Failed to load novels:", e);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, pageSize]
  );

  useEffect(() => {
    setLoading(true);
    setNovels([]);
    setPage(0);
    setHasMore(true);
    loadPage(0, true);
  }, [ptype, status, genre, year, minWordNum, maxWordNum, sortBy, descending]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setLoading(true);
    loadPage(page, false);
  }, [hasMore, loading, page, loadPage]);

  const refresh = useCallback(() => {
    setLoading(true);
    loadPage(0, true);
  }, [loadPage]);

  return { novels, loading, hasMore, loadMore, refresh };
}
