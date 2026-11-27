import { expect, test } from "vitest";
import config from "../../vault.config";

const nonEmpty = (s: unknown) => typeof s === "string" && s.trim().length > 0;

test("cấu hình có tên trang và credit", () => {
  expect(config.siteName).toBe("Zaldor's Vault");
  expect(config.credit).toBe("Zaldor (Vergilize)");
});

test("repo, giscus, donate hoặc để trống hoặc đúng dạng", () => {
  if (config.repo !== null) expect(config.repo).toMatch(/^[\w.-]+\/[\w.-]+$/);
  if (config.giscus !== null) {
    expect(nonEmpty(config.giscus.repoId)).toBe(true);
    expect(nonEmpty(config.giscus.category)).toBe(true);
    expect(nonEmpty(config.giscus.categoryId)).toBe(true);
  }
  if (config.donate !== null) {
    expect(nonEmpty(config.donate.label)).toBe(true);
    expect(config.donate.url).toMatch(/^https:\/\//);
  }
});
