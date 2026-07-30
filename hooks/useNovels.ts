import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "../lib/data/database";
import { type NovelRowData } from "../components/NovelRow";

interface UseNovelsOptions {
  ptype?: number | null;
  status?: number | null;
  genre?: number | null;
  pageSize?: number;
}

export function useNovels({
  ptype = null,
  status = null,
  genre = null,
  pageSize = 20,
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

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY click_num DESC LIMIT ? OFFSET ?";
      params.push(pageSize, pageNum * pageSize);

      return { query, params };
    },
    [ptype, status, genre, pageSize]
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
  }, [ptype, status, genre]);

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
