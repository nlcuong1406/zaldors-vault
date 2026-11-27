import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test } from "vitest";
import { parseSha256File, sha256File } from "../../scripts/lib/hash";
import { foldVietnamese, stripBom } from "../../scripts/lib/text";

test("đọc file .sha256 có BOM và CRLF", () => {
  expect(
    parseSha256File("﻿ACE2671339613EF91C5946F3CBC3F53A28A3B3E7C9E78892D700EA66A671B9DF  a.zip\r\n"),
  ).toBe("ace2671339613ef91c5946f3cbc3f53a28a3b3e7c9e78892d700ea66a671b9df");
  expect(parseSha256File("không phải mã băm")).toBeNull();
});

test("bỏ dấu tiếng Việt", () => {
  expect(foldVietnamese("KHÔNG PHÂN PHỐI")).toBe("khong phan phoi");
  expect(foldVietnamese("Nội bộ, Đừng")).toBe("noi bo, dung");
});

test("stripBom bỏ BOM đầu chuỗi", () => {
  expect(stripBom("﻿abc")).toBe("abc");
  expect(stripBom("abc")).toBe("abc");
});

test("chuỗi 65 ký tự hex không phải mã băm", () => {
  expect(parseSha256File("a".repeat(65))).toBeNull();
});

const dirs: string[] = [];
afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
});

test("sha256File khớp giá trị đã biết", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hash-"));
  dirs.push(dir);
  const p = join(dir, "abc.txt");
  await writeFile(p, "abc");
  expect(await sha256File(p)).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
