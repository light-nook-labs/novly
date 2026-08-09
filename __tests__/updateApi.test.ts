import { describe, expect, it } from "@jest/globals";
import { compareVersions, buildDownloadUrl } from "../utils/updateApi";

describe("compareVersions", () => {
  it("相同版本返回 0", () => {
    expect(compareVersions("1.2.2", "1.2.2")).toBe(0);
  });

  it("忽略 v 前缀", () => {
    expect(compareVersions("1.2.1", "v1.2.2")).toBeLessThan(0);
    expect(compareVersions("v1.2.2", "1.2.1")).toBeGreaterThan(0);
  });

  it("主版本/次版本/补丁逐级比较", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.3.0", "1.2.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.2", "1.2.1")).toBeGreaterThan(0);
  });

  it("忽略 pre-release 字母后缀(a/b 视为低于同段号正式版)", () => {
    expect(compareVersions("1.2.1a", "1.2.1")).toBe(0);
    expect(compareVersions("1.2.1a", "1.2.2")).toBeLessThan(0);
  });

  it("位数不足时补 0", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1", "1.0.0")).toBe(0);
    expect(compareVersions("1.2", "1.2.1")).toBeLessThan(0);
  });
});

describe("buildDownloadUrl", () => {
  const ASSET = "https://github.com/light-nook-labs/novly/releases/download/v1.2.2/novly-v1.2.2.apk";

  it("有镜像:镜像代理资产 URL", () => {
    expect(buildDownloadUrl("https://ghfast.top/", ASSET, "v1.2.2")).toBe(
      "https://ghfast.top/https://github.com/light-nook-labs/novly/releases/download/v1.2.2/novly-v1.2.2.apk",
    );
  });

  it("无镜像:直连资产 URL", () => {
    expect(buildDownloadUrl(null, ASSET, "v1.2.2")).toBe(ASSET);
  });

  it("无资产 URL:回退 release 页", () => {
    expect(buildDownloadUrl(null, null, "v1.2.2")).toBe(
      "https://github.com/light-nook-labs/novly/releases/tag/v1.2.2",
    );
  });
});
