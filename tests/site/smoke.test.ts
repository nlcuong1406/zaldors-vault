import { expect, test } from "vitest";
import config from "../../vault.config";

test("cấu hình mặc định chưa nối dịch vụ ngoài", () => {
  expect(config.siteName).toBe("Zaldor's Vault");
  expect(config.credit).toBe("Zaldor (Vergilize)");
  expect(config.repo).toBeNull();
  expect(config.giscus).toBeNull();
  expect(config.donate).toBeNull();
});
