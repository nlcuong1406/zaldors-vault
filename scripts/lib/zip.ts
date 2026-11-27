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
  return name.replace(/\\/g, "/");
}

/** Chạy fn cho từng mục (không phải thư mục) của zip; luôn đóng zip. */
async function forEachFile(zipPath: string, fn: (zf: yauzl.ZipFile, entry: yauzl.Entry, path: string) => Promise<void>): Promise<void> {
  const zf = await openZip(zipPath);
  try {
    await new Promise<void>((resolve, reject) => {
      zf.on("error", reject);
      zf.on("end", () => resolve());
      zf.on("entry", (entry: yauzl.Entry) => {
        const path = normalisePath(entry.fileName);
        const problem = yauzl.validateFileName(entry.fileName);
        if (problem) return reject(new Error(`zip: tên mục không hợp lệ (${problem}): ${entry.fileName}`));
        if (path.endsWith("/")) return zf.readEntry();
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
  await forEachFile(zipPath, async (zf, entry, path) => {
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
    out[path.slice(root.length)] = stripBom(Buffer.concat(chunks).toString("utf8"));
  });
  return out;
}
