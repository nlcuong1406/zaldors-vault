import { afterAll, beforeAll, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadReleases, validateGame } from "../../src/lib/games";
import type { Release } from "../../scripts/lib/types";

let tmp: string;

function rel(version: string): Release {
  return {
    version,
    date: "2026-11-27",
    fileName: `patch-${version}.zip`,
    sizeBytes: 1024,
    sha256: "a".repeat(64),
    url: "https://example.invalid/x.zip",
    gameBuild: "1",
    notes: "",
  };
}

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "vault-games-"));
  mkdirSync(join(tmp, "src", "data", "releases"), { recursive: true });
  mkdirSync(join(tmp, "tests", "fixtures", "releases"), { recursive: true });
  writeFileSync(
    join(tmp, "src", "data", "releases", "g.json"),
    JSON.stringify([rel("0.9.0"), rel("0.10.0"), rel("0.9.1")]),
  );
  writeFileSync(join(tmp, "tests", "fixtures", "releases", "g.json"), JSON.stringify([rel("1.0.0")]));
});

afterAll(() => rmSync(tmp, { recursive: true, force: true }));

test("thiếu file releases thì trả mảng rỗng", () => {
  expect(loadReleases("khong-co", { root: tmp })).toEqual([]);
});

test("sắp phiên bản theo số, không theo chữ", () => {
  expect(loadReleases("g", { root: tmp }).map((r) => r.version)).toEqual(["0.10.0", "0.9.1", "0.9.0"]);
});

test("fixtures chỉ được đọc khi bật", () => {
  expect(loadReleases("g", { root: tmp, fixtures: false }).map((r) => r.version)).toEqual(["0.10.0", "0.9.1", "0.9.0"]);
  expect(loadReleases("g", { root: tmp, fixtures: true })).toHaveLength(1);
});

test("hoàn thành mà không có bản tải thì lỗi, nêu tên game", () => {
  expect(() => validateGame({ id: "zelda-oot3d", status: "hoan-thanh" }, [])).toThrow(/zelda-oot3d/);
  expect(() => validateGame({ id: "x", status: "dang-dich" }, [])).not.toThrow();
});
