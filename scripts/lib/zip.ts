import { createHash } from "node:crypto";
import yauzl from "yauzl";
import { stripBom } from "./text";
import type { ZipEntry } from "./types";

const TEXT_EXT = /\.(txt|md|json)$/i;
const MAX_TEXT_BYTES = 1024 * 1024;

function openZip(zipPath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zf) => (err || !zf ? reject(err ?? new Error("zip: không mở được")) : resolve(zf)));
  });
}

function openStream(zf: yauzl.ZipFile, entry: yauzl.Entry): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    zf.openReadStream(entry, (err, stream) => (err || !stream ? reject(err ?? new Error("zip: không đọc được mục")) : resolve(stream)));
  });
}

function normalisePath(name: string): string {
  let p = name.replace(/\\/g, "/");
  while (p.startsWith("./")) p = p.slice(2);
  while (p.includes("/./")) p = p.replace(/\/(\.\/)+/g, "/");
  return p;
}

/** Chạy fn cho từng mục (không phải thư mục) của zip; luôn đóng zip. */
async function forEachFile(zipPath: string, fn: (zf: yauzl.ZipFile, entry: yauzl.Entry, path: string) => Promise<void>): Promise<void> {
  const zf = await openZip(zipPath);
  try {
    await new Promise<void>((resolve, reject) => {
      zf.on("error", reject);
      zf.on("end", () => resolve());
      zf.on("entry", (entry: yauzl.Entry) => {
        const isDir = entry.fileName.replace(/\\/g, "/").endsWith("/");
        const path = normalisePath(entry.fileName);
        const problem = yauzl.validateFileName(entry.fileName);
        if (problem) return reject(new Error(`zip: tên mục không hợp lệ (${problem}): ${entry.fileName}`));
        if (isDir) {
          if (entry.uncompressedSize > 0) return reject(new Error(`zip: mục thư mục có dữ liệu: ${entry.fileName}`));
          return zf.readEntry();
        }
        if (path === "" || path.startsWith("/") || path === "." || path.endsWith("/.")) {
          return reject(new Error(`zip: đường dẫn mục không hợp lệ: ${entry.fileName}`));
        }
        fn(zf, entry, path).then(() => zf.readEntry(), reject);
      });
      zf.readEntry();
    });
  } finally {
    zf.close();
  }
}

export async function listEntries(zipPath: string): Promise<ZipEntry[]> {
  const out: ZipEntry[] = [];
  const seen = new Set<string>();
  await forEachFile(zipPath, async (zf, entry, path) => {
    const key = path.toLowerCase();
    if (seen.has(key)) throw new Error(`zip: trùng tên mục: ${path}`);
    seen.add(key);
    const stream = await openStream(zf, entry);
    const hash = createHash("sha256");
    let size = 0;
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => {
        hash.update(chunk);
        size += chunk.length;
      });
      stream.on("error", reject);
      stream.on("end", () => resolve());
    });
    out.push({ path, sizeBytes: size, sha256: hash.digest("hex") });
  });
  return out;
}

/** "" nếu có file ở gốc hoặc nhiều thư mục gốc; "Ten/" nếu mọi file nằm trong đúng một thư mục gốc. */
export function packageRoot(entries: ZipEntry[]): string {
  if (entries.length === 0) return "";
  let top: string | null = null;
  for (const e of entries) {
    const i = e.path.indexOf("/");
    if (i < 0) return "";
    const name = e.path.slice(0, i);
    if (top === null) top = name;
    else if (top !== name) return "";
  }
  return `${top}/`;
}

/** UTF-16 (có BOM) hoặc UTF-8 nghiêm ngặt; byte không hợp lệ thì ném lỗi (không đoán bảng mã cũ). */
function decodeText(buf: Buffer, path: string): string {
  const text = decodeRaw(buf, path);
  if (text.includes("\u0000")) throw new Error(`zip: ${path} chứa ký tự NUL (có thể là UTF-16 không BOM)`);
  return text;
}

function decodeRaw(buf: Buffer, path: string): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    const body = buf.subarray(2);
    if (body.length % 2 !== 0) throw new Error(`zip: ${path} không phải UTF-16 hợp lệ`);
    return stripBom(body.toString("utf16le"));
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const body = Buffer.from(buf.subarray(2));
    if (body.length % 2 !== 0) throw new Error(`zip: ${path} không phải UTF-16 hợp lệ`);
    body.swap16();
    return body.toString("utf16le");
  }
  try {
    return stripBom(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buf));
  } catch {
    throw new Error(`zip: ${path} không phải UTF-8 hợp lệ`);
  }
}

export async function readRootTexts(zipPath: string, entries: ZipEntry[]): Promise<Record<string, string>> {
  const root = packageRoot(entries);
  const wanted = new Set<string>();
  for (const e of entries) {
    if (!e.path.startsWith(root)) continue;
    const name = e.path.slice(root.length);
    if (name.includes("/") || !TEXT_EXT.test(name) || e.sizeBytes >= MAX_TEXT_BYTES) continue;
    wanted.add(e.path);
  }
  const out: Record<string, string> = {};
  if (wanted.size === 0) return out;
  await forEachFile(zipPath, async (zf, entry, path) => {
    if (!wanted.has(path)) return;
    const stream = await openStream(zf, entry);
    const chunks: Buffer[] = [];
    let total = 0;
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (c: Buffer) => {
        total += c.length;
        if (total >= MAX_TEXT_BYTES) return reject(new Error(`zip: ${path} lớn hơn dự kiến`));
        chunks.push(c);
      });
      stream.on("error", reject);
      stream.on("end", () => resolve());
    });
    out[path.slice(root.length)] = decodeText(Buffer.concat(chunks), path);
  });
  return out;
}
