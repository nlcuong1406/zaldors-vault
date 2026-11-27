import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test } from "vitest";
import { readStore, upsertRelease } from "../../scripts/lib/releases-store";
import type { Release } from "../../scripts/lib/types";

const root = mkdtempSync(join(tmpdir(), "vault-store-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const rel = (version: string): Release => ({
  version,
  date: "2026-11-27",
  fileName: `p-${version}.zip`,
  sizeBytes: 10,
  sha256: "a".repeat(64),
  url: `https://example.test/${version}.zip`,
  gameBuild: "1",
  notes: "n",
});

test("kho: thêm rồi thay cùng phiên bản", () => {
  upsertRelease(root, "g", rel("0.9.0"));
  upsertRelease(root, "g", rel("0.9.1"));
  upsertRelease(root, "g", { ...rel("0.9.1"), notes: "mới" });
  const s = readStore(root, "g");
  expect(s).toHaveLength(2);
  expect(s.map((r) => r.version)).toEqual(["0.9.0", "0.9.1"]);
  expect(s.find((r) => r.version === "0.9.1")!.notes).toBe("mới");
  const raw = readFileSync(join(root, "src/data/releases/g.json"), "utf8");
  expect(raw.endsWith("\n")).toBe(true);
  expect(raw.includes("\r")).toBe(false);
  expect(raw).toBe(JSON.stringify(s, null, 2) + "\n");
});

test("thiếu file thì trả về mảng rỗng", () => {
  expect(readStore(root, "khong-co")).toEqual([]);
});

test("JSON hỏng hoặc không phải mảng thì báo lỗi nêu tên file", () => {
  mkdirSync(join(root, "src/data/releases"), { recursive: true });
  writeFileSync(join(root, "src/data/releases/bad.json"), "{hỏng");
  expect(() => readStore(root, "bad")).toThrow(/bad\.json/);
  writeFileSync(join(root, "src/data/releases/obj.json"), "{}");
  expect(() => readStore(root, "obj")).toThrow(/obj\.json/);
  expect(() => upsertRelease(root, "bad", rel("1.0.0"))).toThrow(/bad\.json/);
});
