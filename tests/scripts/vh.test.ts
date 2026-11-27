import { mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { findReleaseZip, listProjectIds, listReleaseZips, loadProject } from "../../scripts/lib/vh";
import { cleanupFakeVh, makeFakeVh } from "../helpers/fake-vh";

afterAll(cleanupFakeVh);

const base = { title: "Game Thử", platform: "pc", edition: "base" };
let root: string;

beforeAll(async () => {
  root = await makeFakeVh({
    "game-thu": {
      projectJson: {
        id: "game-thu",
        ...base,
        inputs: [{ path: "a.bin", sha256: "AB".repeat(32) }, { path: "b.bin" }],
      },
      zips: {
        "G-v0.9.0.zip": { "a.txt": "a" },
        "G-v0.9.1.zip": { "a.txt": "b" },
        "G-v0.9.10.zip": { "a.txt": "c" },
      },
      extraFiles: { "release/G-v0.9.1.zip.sha256": "x", "release/G-v0.9.1/readme.txt": "x" },
    },
    "khong-inputs": { projectJson: { id: "khong-inputs", ...base } },
    "hai-zip": {
      projectJson: { id: "hai-zip", ...base },
      zips: { "G-v1.0.zip": { "a.txt": "a" }, "G-v1.0-b.zip": { "a.txt": "b" } },
    },
    "ban-noi-bo-kem": {
      projectJson: { id: "ban-noi-bo-kem", ...base },
      zips: { "SB-v0.3-internal.zip": { "a.txt": "a" }, "SB-v0.3.zip": { "a.txt": "b" } },
    },
    "hai-noi-bo": {
      projectJson: { id: "hai-noi-bo", ...base },
      zips: { "G-v1.0-internal.zip": { "a.txt": "a" }, "G-v1.0-Internal-b.zip": { "a.txt": "b" } },
    },
    ma: {},
    hong: { extraFiles: { "project.json": "{ không phải json" } },
    "co-bom": {
      extraFiles: {
        "project.json": "﻿" + JSON.stringify({ id: "co-bom", ...base }).replace(/,/g, ",\r\n"),
      },
    },
    "chi-v10": {
      projectJson: { id: "chi-v10", ...base },
      zips: { "G-v0.9.10.zip": { "a.txt": "a" } },
    },
    "noi-bo": {
      projectJson: { id: "noi-bo", ...base },
      zips: { "SB-VH-v0.3-internal.zip": { "a.txt": "a" }, "Xdev1.0.zip": { "a.txt": "b" } },
    },
    "khong-release": { projectJson: { id: "khong-release", ...base } },
  });
  await mkdir(join(root, "projects", "chi-thu-muc-rong"), { recursive: true });
});

test("loadProject lấy trường và mã băm đầu vào", () => {
  const p = loadProject(root, "game-thu");
  expect(p.inputHashes).toEqual(["ab".repeat(32)]);
  expect(p.title).toBe("Game Thử");
  expect(p.releaseDir).toBe(join(root, "projects", "game-thu", "release"));
});

test("project.json không có inputs vẫn đọc được", () => {
  expect(loadProject(root, "khong-inputs").inputHashes).toEqual([]);
});

test("loadProject chịu BOM và CRLF", () => {
  expect(loadProject(root, "co-bom").title).toBe("Game Thử");
});

test("loadProject báo id khi thiếu file hoặc JSON hỏng", () => {
  expect(() => loadProject(root, "ma")).toThrow(/ma/);
  expect(() => loadProject(root, "hong")).toThrow(/hong/);
});

test("listProjectIds chỉ lấy thư mục có project.json, sắp a-z", async () => {
  const ids = listProjectIds(root);
  expect(ids).toEqual(["ban-noi-bo-kem", "chi-v10", "co-bom", "game-thu", "hai-noi-bo", "hai-zip", "hong", "khong-inputs", "khong-release", "noi-bo"]);
  expect(listProjectIds(await makeFakeVh({}))).toEqual([]);
});

test("listReleaseZips: chỉ file .zip (không phân biệt hoa thường), sắp a-z, thiếu thư mục thì []", () => {
  const p = loadProject(root, "game-thu");
  const names = listReleaseZips(p.releaseDir);
  expect(names.length).toBeGreaterThan(0);
  expect(names.every((n) => /\.zip$/i.test(n))).toBe(true);
  expect(names).toEqual([...names].sort());
  expect(listReleaseZips(join(root, "khong-co-thu-muc"))).toEqual([]);
});

test("tìm zip theo phiên bản, không khớp tiền tố", () => {
  const p = loadProject(root, "game-thu");
  expect(basename(findReleaseZip(p, "0.9.1"))).toBe("G-v0.9.1.zip");
  expect(() => findReleaseZip(p, "0.9")).toThrow(/không tìm thấy/);
});

test("bỏ qua thư mục giải nén và file .sha256", () => {
  const p = loadProject(root, "game-thu");
  expect(basename(findReleaseZip(p, "0.9.0"))).toBe("G-v0.9.0.zip");
});

test("hai zip cùng phiên bản thì dừng", () => {
  const p = loadProject(root, "hai-zip");
  expect(() => findReleaseZip(p, "1.0")).toThrow(/nhiều hơn một/);
});

test("trùng phiên bản: bỏ bản internal nếu còn đúng một bản", () => {
  expect(basename(findReleaseZip(loadProject(root, "ban-noi-bo-kem"), "0.3"))).toBe("SB-v0.3.zip");
});

test("trùng phiên bản mà toàn bản internal thì vẫn dừng và liệt kê đủ tên", () => {
  expect(() => findReleaseZip(loadProject(root, "hai-noi-bo"), "1.0")).toThrow(/nhiều hơn một.*G-v1\.0-Internal-b\.zip, G-v1\.0-internal\.zip/);
  expect(() => findReleaseZip(loadProject(root, "hai-zip"), "1.0")).toThrow(/G-v1\.0-b\.zip, G-v1\.0\.zip|G-v1\.0\.zip, G-v1\.0-b\.zip/);
});

test("0.9.1 không khớp v0.9.10", () => {
  expect(() => findReleaseZip(loadProject(root, "chi-v10"), "0.9.1")).toThrow(/không tìm thấy/);
});

test("0.3 khớp bản -internal; 1.0 không khớp Xdev1.0.zip", () => {
  const p = loadProject(root, "noi-bo");
  expect(basename(findReleaseZip(p, "0.3"))).toBe("SB-VH-v0.3-internal.zip");
  expect(() => findReleaseZip(p, "1.0")).toThrow(/không tìm thấy/);
});

test("phiên bản trống bị từ chối", () => {
  expect(() => findReleaseZip(loadProject(root, "noi-bo"), "  ")).toThrow(/trống/);
});

test("thiếu thư mục release thì báo không tìm thấy", () => {
  expect(() => findReleaseZip(loadProject(root, "khong-release"), "1.0")).toThrow(/không tìm thấy/);
});
