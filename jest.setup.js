// Jest 全局 mock:AsyncStorage(react-native 原生模块在 jest 环境不可用;
// 官方 jest mock 子路径在 pnpm 下解析失败,改用内联 mock)
jest.mock("@react-native-async-storage/async-storage", () => {
  const mock = {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
    getAllKeys: jest.fn(async () => []),
    multiGet: jest.fn(async () => []),
    multiSet: jest.fn(async () => undefined),
  };
  return { __esModule: true, default: mock };
});
