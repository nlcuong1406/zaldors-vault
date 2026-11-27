import { afterAll, describe, expect, test } from "vitest";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import yazl from "yazl";
import { checkPackage } from "../../scripts/lib/guard";
import { listEntries, packageRoot, readRootTexts } from "../../scripts/lib/zip";

const dirs: string[] = [];
afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
});

async function makeZip(files: Record<string, string | Buffer>, emptyDirs: string[] = []): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "zip-test-"));
  dirs.push(dir);
  const path = join(dir, "t.zip");
  const zip = new yazl.ZipFile();
  for (const d of emptyDirs) zip.addEmptyDirectory(d);
  for (const [name, content] of Object.entries(files)) {
    zip.addBuffer(Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8"), name);
  }
  zip.end();
  await pipeline(zip.outputStream, createWriteStream(path));
  return path;
}

describe("listEntries", () => {
  test("liệt kê mục, bỏ thư mục, đường dẫn dùng /", async () => {
    const zip = await makeZip({ "data/a.bin": "abc", "README.txt": "hi" });
    const e = await listEntries(zip);
    expect(e.map((x) => x.path).sort()).toEqual(["README.txt", "data/a.bin"]);
    const a = e.find((x) => x.path === "data/a.bin")!;
    expect(a.sha256).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(a.sizeBytes).toBe(3);
  });

  test("bỏ mục thư mục tường minh", async () => {
    const zip = await makeZip({ "G-v1/data/a.bin": "abc" }, ["G-v1/", "G-v1/data/"]);
    const e = await listEntries(zip);
    expect(e.map((x) => x.path)).toEqual(["G-v1/data/a.bin"]);
  });

  test("từ chối mục có đường dẫn không an toàn", async () => {
    // yazl refuses "..", so write "xx/evil.txt" and patch the name bytes afterwards.
    const zip = await makeZip({ "xx/evil.txt": "x" });
    const buf = await readFile(zip);
    const from = Buffer.from("xx/evil.txt");
    const to = Buffer.from("../evil.txt");
    for (let i = buf.indexOf(from); i >= 0; i = buf.indexOf(from, i + 1)) to.copy(buf, i);
    await writeFile(zip, buf);
    await expect(listEntries(zip)).rejects.toThrow();
  });

  test("báo lỗi khi file không phải zip", async () => {
    const dir = await mkdtemp(join(tmpdir(), "zip-test-"));
    dirs.push(dir);
    const p = join(dir, "bad.zip");
    await pipeline(async function* () { yield Buffer.from("not a zip"); }, createWriteStream(p));
    await expect(listEntries(p)).rejects.toThrow();
  });
});

async function patchNames(zip: string, pairs: [string, string][]): Promise<void> {
  const buf = await readFile(zip);
  for (const [a, b] of pairs) {
    const from = Buffer.from(a);
    const to = Buffer.from(b);
    for (let i = buf.indexOf(from); i >= 0; i = buf.indexOf(from, i + 1)) to.copy(buf, i);
  }
  await writeFile(zip, buf);
}

describe("listEntries hardening", () => {
  test("từ chối tên mục trùng nhau (không phân biệt hoa thường)", async () => {
    const zip = await makeZip({ "a1.txt": "một", "a2.txt": "hai" });
    await patchNames(zip, [["a2.txt", "A1.TXT"]]);
    await expect(listEntries(zip)).rejects.toThrow(/trùng tên/);
  });
  test("từ chối mục thư mục có dữ liệu", async () => {
    const zip = await makeZip({ d1: "abc" });
    await patchNames(zip, [["d1", "d/"]]);
    await expect(listEntries(zip)).rejects.toThrow(/thư mục có dữ liệu/);
  });
  test("bỏ tiền tố ./ khỏi đường dẫn", async () => {
    const zip = await makeZip({ "xxG-v1/README.txt": "a" });
    await patchNames(zip, [["xxG-v1", "./G-v1"]].map(([a]) => [a, "./G-v1".padEnd(a.length, "/")] as [string, string]));
    const e = await listEntries(zip);
    expect(e.map((x) => x.path)).toEqual(["G-v1/README.txt"]);
    expect(packageRoot(e)).toBe("G-v1/");
  });
});

describe("encodings", () => {
  test("UTF-16LE có BOM được giải mã và bị chặn", async () => {
    const body = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("Bản Nội bộ", "utf16le")]);
    const zip = await makeZip({ "G-v1/README.txt": body });
    const entries = await listEntries(zip);
    const texts = await readRootTexts(zip, entries);
    expect(texts["README.txt"]).toBe("Bản Nội bộ");
    expect(checkPackage({ zipFileName: "a.zip", entries, inputHashes: [], rootTexts: texts }).map((b) => b.rule)).toEqual(["no-distribute-notice"]);
  });
  test("UTF-16BE có BOM được giải mã", async () => {
    const le = Buffer.from("Nội bộ", "utf16le");
    const be = Buffer.from(le).swap16();
    const zip = await makeZip({ "README.txt": Buffer.concat([Buffer.from([0xfe, 0xff]), be]) });
    expect(await readRootTexts(zip, await listEntries(zip))).toEqual({ "README.txt": "Nội bộ" });
  });
  test("byte không phải UTF-8 hợp lệ thì từ chối", async () => {
    const zip = await makeZip({ "README.txt": Buffer.from([0x4e, 0xe9, 0x69, 0x20, 0x62, 0xe9]) });
    await expect(readRootTexts(zip, await listEntries(zip))).rejects.toThrow(/UTF-8/);
  });
});

describe("packageRoot", () => {
  test("gốc gói: phẳng và bọc một thư mục", () => {
    expect(packageRoot([{ path: "README.txt" }, { path: "data/a" }] as any)).toBe("");
    expect(packageRoot([{ path: "G-v1/README.txt" }, { path: "G-v1/data/a" }] as any)).toBe("G-v1/");
  });
  test("file ở gốc cùng một thư mục thì gốc là rỗng", () => {
    expect(packageRoot([{ path: "README.txt" }, { path: "G-v1/data/a" }] as any)).toBe("");
  });
  test("hai thư mục gốc khác nhau thì gốc là rỗng", () => {
    expect(packageRoot([{ path: "A/x" }, { path: "B/y" }] as any)).toBe("");
  });
  test("không có mục nào thì gốc là rỗng", () => {
    expect(packageRoot([])).toBe("");
  });
});

describe("readRootTexts", () => {
  test("đọc văn bản gốc trong gói bọc thư mục, bỏ BOM", async () => {
    const zip = await makeZip({
      "G-v1/PHAT-HANH.txt": "﻿Sửa lỗi\r\n",
      "G-v1/data/sau.txt": "không đọc",
      "G-v1/data/a.bin": "abc",
    });
    const entries = await listEntries(zip);
    expect(await readRootTexts(zip, entries)).toEqual({ "PHAT-HANH.txt": "Sửa lỗi\r\n" });
  });

  test("zip có thư mục tường minh vẫn tìm đúng gốc", async () => {
    const zip = await makeZip({ "G-v1/README.md": "xin chào" }, ["G-v1/"]);
    const entries = await listEntries(zip);
    expect(await readRootTexts(zip, entries)).toEqual({ "README.md": "xin chào" });
  });

  test("file ở gốc zip và có cả thư mục: gốc rỗng, chỉ đọc file ở gốc", async () => {
    const zip = await makeZip({ "README.txt": "gốc", "G-v1/GHI-CONG.txt": "trong thư mục" });
    const entries = await listEntries(zip);
    expect(packageRoot(entries)).toBe("");
    expect(await readRootTexts(zip, entries)).toEqual({ "README.txt": "gốc" });
  });

  test("phần mở rộng không phân biệt hoa thường; bỏ file khác loại", async () => {
    const zip = await makeZip({ "A.TXT": "a", "b.Json": "{}", "c.md": "c", "d.bat": "d" });
    const entries = await listEntries(zip);
    expect(await readRootTexts(zip, entries)).toEqual({ "A.TXT": "a", "b.Json": "{}", "c.md": "c" });
  });

  test("bỏ file từ 1 MB trở lên", async () => {
    const zip = await makeZip({ "big.txt": Buffer.alloc(1024 * 1024, 0x61), "ok.txt": Buffer.alloc(1024 * 1024 - 1, 0x61) });
    const entries = await listEntries(zip);
    expect(Object.keys(await readRootTexts(zip, entries))).toEqual(["ok.txt"]);
  });
});
