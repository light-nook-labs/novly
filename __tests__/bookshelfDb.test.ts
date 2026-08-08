import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// 伪 SQLite:记录调用供断言(单例 promise 缓存,所有函数共用同一连接)
const mockOpenDatabaseAsync = jest.fn();
const mockDb: any = {
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
};
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: (...args: unknown[]) => {
    mockOpenDatabaseAsync(...args);
    return Promise.resolve(mockDb);
  },
}));

// eslint-disable-next-line import/first -- jest.mock 需先于被测模块导入(工厂引用上方 mock 变量)
import {
  addToBookshelf,
  clearBookshelf,
  getBookshelf,
  getBookshelfDb,
  isInBookshelf,
  removeFromBookshelf,
} from "../utils/bookshelfDb";

describe("bookshelfDb", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("初始化创建表并缓存连接(单例)", async () => {
    const db1 = await getBookshelfDb();
    const db2 = await getBookshelfDb();
    expect(db1).toBe(db2);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledWith("bookshelf.sqlite");
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS bookshelf"),
    );
  });

  it("isInBookshelf 按计数判断存在", async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ c: 1 });
    await expect(isInBookshelf(5)).resolves.toBe(true);
    mockDb.getFirstAsync.mockResolvedValueOnce({ c: 0 });
    await expect(isInBookshelf(9)).resolves.toBe(false);
  });

  it("addToBookshelf 执行 INSERT OR REPLACE(带全部字段)", async () => {
    await addToBookshelf({
      id: 1,
      title: "小说A",
      author: "作者",
      cover: null,
      genre: 3,
      status: 3,
      ptype: 2,
      click_num: 100,
      word_num: 2000,
      like_num: 50,
      last_update: null,
    });
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO bookshelf"),
      expect.arrayContaining([1, "小说A", "作者", 3, 3, 2]),
    );
  });

  it("getBookshelf 查询全部(按 added_at 倒序)", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);
    await expect(getBookshelf()).resolves.toEqual([]);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY added_at DESC, id DESC"),
    );
  });

  it("removeFromBookshelf/clearBookshelf 执行 DELETE", async () => {
    await removeFromBookshelf(3);
    expect(mockDb.runAsync).toHaveBeenCalledWith("DELETE FROM bookshelf WHERE id = ?", [3]);
    await clearBookshelf();
    expect(mockDb.runAsync).toHaveBeenCalledWith("DELETE FROM bookshelf");
  });
});
