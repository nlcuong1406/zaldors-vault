import { expect, test } from "vitest";
import { formatBytes, formatDate } from "../../src/lib/format";

test("định dạng", () => {
  expect(formatBytes(14_680_064)).toBe("14 MB");
  expect(formatBytes(1_610_612_736)).toBe("1,5 GB");
  expect(formatBytes(512_000)).toBe("500 KB");
  expect(formatDate("2026-11-27")).toBe("27/11/2026");
});
