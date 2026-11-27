import { expect, test } from "vitest";
import { resolveReleaseInfo } from "../../scripts/lib/release-info";

const manifest = JSON.stringify({ version: "0.9.1", date: "2026-11-27", game: { build: "17233673" } });

test("lấy đủ từ gói LAD8", () => {
  expect(
    resolveReleaseInfo({
      notesFileText: null,
      gameBuildFlag: null,
      today: "2027-01-01",
      rootTexts: { "PHAT-HANH.txt": "﻿Sửa 12 câu\r\nThêm font\r\n", "manifest.json": manifest },
    }),
  ).toEqual({ notes: "Sửa 12 câu\nThêm font", date: "2026-11-27", gameBuild: "17233673" });
});

test("--notes và --game-build thắng nội dung gói", () => {
  const r = resolveReleaseInfo({
    notesFileText: "Ghi chú tay",
    gameBuildFlag: "999",
    today: "2027-01-01",
    rootTexts: { "PHAT-HANH.txt": "cũ", "manifest.json": manifest },
  });
  expect(r.notes).toBe("Ghi chú tay");
  expect(r.gameBuild).toBe("999");
});

test("không có ghi chú thì yêu cầu --notes", () => {
  expect(() =>
    resolveReleaseInfo({ notesFileText: null, gameBuildFlag: "1", today: "2027-01-01", rootTexts: {} }),
  ).toThrow(/--notes/);
  expect(() =>
    resolveReleaseInfo({ notesFileText: "  \n", gameBuildFlag: "1", today: "2027-01-01", rootTexts: {} }),
  ).toThrow(/--notes/);
});

test("không có manifest thì cần --game-build, ngày là hôm nay", () => {
  expect(() =>
    resolveReleaseInfo({ notesFileText: "a", gameBuildFlag: null, today: "2027-01-01", rootTexts: {} }),
  ).toThrow(/--game-build/);
  expect(
    resolveReleaseInfo({
      notesFileText: "a",
      gameBuildFlag: "1.5.0",
      today: "2027-01-01",
      rootTexts: { "manifest.json": "{hỏng" },
    }).date,
  ).toBe("2027-01-01");
});

test("game.build là số hữu hạn thì đổi thành chuỗi", () => {
  const m = JSON.stringify({ game: { build: 17233673 } });
  expect(
    resolveReleaseInfo({ notesFileText: "a", gameBuildFlag: null, today: "2027-01-01", rootTexts: { "manifest.json": m } })
      .gameBuild,
  ).toBe("17233673");
});

test("game.build rỗng hoặc chỉ khoảng trắng thì coi như thiếu; cờ rỗng coi như không có", () => {
  const m = JSON.stringify({ game: { build: "  " } });
  expect(() =>
    resolveReleaseInfo({ notesFileText: "a", gameBuildFlag: "  ", today: "2027-01-01", rootTexts: { "manifest.json": m } }),
  ).toThrow(/--game-build/);
  const ok = JSON.stringify({ game: { build: "42" } });
  expect(
    resolveReleaseInfo({ notesFileText: "a", gameBuildFlag: " ", today: "2027-01-01", rootTexts: { "manifest.json": ok } })
      .gameBuild,
  ).toBe("42");
  expect(
    resolveReleaseInfo({ notesFileText: "a", gameBuildFlag: " 7 ", today: "2027-01-01", rootTexts: {} }).gameBuild,
  ).toBe("7");
});

test("ngày manifest sai dạng thì dùng hôm nay", () => {
  const m = JSON.stringify({ date: "27/11/2026", game: { build: "1" } });
  expect(
    resolveReleaseInfo({ notesFileText: "a", gameBuildFlag: null, today: "2027-01-01", rootTexts: { "manifest.json": m } })
      .date,
  ).toBe("2027-01-01");
});
