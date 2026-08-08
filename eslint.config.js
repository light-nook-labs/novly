// ESLint flat config(Expo SDK 57 推荐用法)
// 冗余/未使用代码规则集中在此,保持代码整洁
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const unusedImports = require("eslint-plugin-unused-imports");

module.exports = defineConfig([
  // 明确 lint 范围:排除构建产物/补丁/原生目录,避免误扫
  { ignores: ["dist/**", "temp/**", "patches/**", "android/**", "ios/**", "src-tauri/**", "node_modules/**"] },
  expoConfig,
  {
    // 冗余规则仅作用于应用 TS 源码(js 配置文件不适用 @typescript-eslint 插件)
    files: ["**/*.{ts,tsx}"],
    plugins: { "unused-imports": unusedImports },
    rules: {
      // 未使用导入(自动修复)
      "unused-imports/no-unused-imports": "error",
      // 未使用变量/参数(前缀 _ 忽略,如解构占位)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // 同一模块重复导入
      "no-duplicate-imports": "error",
      // React 19 新严格规则对既有代码大量误报,降为 warning(非冗余范畴,不阻塞 lint)
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);
