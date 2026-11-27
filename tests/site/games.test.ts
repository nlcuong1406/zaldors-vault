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

function rootWith(content: string): string {
  const r = mkdtempSync(join(tmpdir(), "vault-games-bad-"));
  mkdirSync(join(r, "src", "data", "releases"), { recursive: true });
  writeFileSync(join(r, "src", "data", "releases", "bad.json"), content);
  dirs.push(r);
  return r;
}
const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

test("url không phải https thì lỗi, nêu file và trường", () => {
  const root = rootWith(JSON.stringify([{ ...rel("1.0.0"), url: "http://x/y.zip" }]));
  expect(() => loadReleases("bad", { root })).toThrow(/bad\.json.*url/);
});

test("sha256 sai thì lỗi, nêu file và trường", () => {
  const root = rootWith(JSON.stringify([{ ...rel("1.0.0"), sha256: "A".repeat(64) }]));
  expect(() => loadReleases("bad", { root })).toThrow(/bad\.json.*sha256/);
});

test("không phải mảng thì lỗi; BOM được bỏ qua", () => {
  expect(() => loadReleases("bad", { root: rootWith("{}") })).toThrow(/bad\.json/);
  expect(loadReleases("bad", { root: rootWith("﻿" + JSON.stringify([rel("1.0.0")])) })).toHaveLength(1);
});

test("file mẫu lad8 hợp lệ", () => {
  expect(loadReleases("lad8-infinite-wealth", { fixtures: true })).toHaveLength(2);
});

test("hoàn thành mà không có bản tải thì lỗi, nêu tên game", () => {
  expect(() => validateGame({ id: "zelda-oot3d", status: "hoan-thanh" }, [])).toThrow(/zelda-oot3d/);
  expect(() => validateGame({ id: "x", status: "dang-dich" }, [])).not.toThrow();
});
