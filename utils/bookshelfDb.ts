import * as SQLite from "expo-sqlite";

// 书架是用户的私有数据，使用独立本地数据库，
// 不依赖全局 novels DB（全局 DB 可能被重置为默认数据）。

const BOOKSHELF_DB = "bookshelf.sqlite";

export interface BookshelfNovel {
  id: number;
  title: string;
  author: string | null;
  cover: string | null;
  genre: number;
  status: number;
  ptype: number;
  click_num: number | null;
  word_num: number | null;
  like_num: number | null;
  last_update: string | null;
  added_at: string;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function initBookshelfDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initBookshelfDbInternal();
  }
  return dbPromise;
}

async function initBookshelfDbInternal(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(BOOKSHELF_DB);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS bookshelf (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      cover TEXT,
      genre INTEGER NOT NULL DEFAULT 0,
      status INTEGER NOT NULL DEFAULT 0,
      ptype INTEGER NOT NULL DEFAULT 0,
      click_num INTEGER,
      word_num INTEGER,
      like_num INTEGER,
      last_update TEXT,
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return database;
}

export async function getBookshelfDb(): Promise<SQLite.SQLiteDatabase> {
  return initBookshelfDb();
}

export async function isInBookshelf(id: number): Promise<boolean> {
  const db = await getBookshelfDb();
  const row = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM bookshelf WHERE id = ?",
    [id]
  );
  return (row?.c ?? 0) > 0;
}

export async function addToBookshelf(novel: Omit<BookshelfNovel, "added_at">): Promise<void> {
  const db = await getBookshelfDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO bookshelf
      (id, title, author, cover, genre, status, ptype, click_num, word_num, like_num, last_update, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      novel.id,
      novel.title,
      novel.author,
      novel.cover,
      novel.genre,
      novel.status,
      novel.ptype,
      novel.click_num,
      novel.word_num,
      novel.like_num,
      novel.last_update,
    ]
  );
}

export async function removeFromBookshelf(id: number): Promise<void> {
  const db = await getBookshelfDb();
  await db.runAsync("DELETE FROM bookshelf WHERE id = ?", [id]);
}

export async function getBookshelf(): Promise<BookshelfNovel[]> {
  const db = await getBookshelfDb();
  return db.getAllAsync<BookshelfNovel>(
    `SELECT id, title, author, cover, genre, status, ptype,
            click_num, word_num, like_num, last_update, added_at
     FROM bookshelf ORDER BY added_at DESC, id DESC`
  );
}

export async function clearBookshelf(): Promise<void> {
  const db = await getBookshelfDb();
  await db.runAsync("DELETE FROM bookshelf");
}
