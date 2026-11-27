import { foldVietnamese } from "./text";
import type { ZipEntry } from "./types";

export interface Block {
  rule: "internal-name" | "original-file" | "container-file" | "no-distribute-notice";
  detail: string;
}

const NOTICES = ["khong phan phoi", "noi bo"];
const CONTAINER_RE = /\.(pak|ucas|utoc)$/i;

function normalise(text: string): string {
  return foldVietnamese(text).replace(/[\s ]+/g, " ");
}

export function hasNoDistributeNotice(text: string): boolean {
  const t = normalise(text);
  return NOTICES.some((n) => t.includes(n));
}

interface PakManifest {
  name: string;
  sha256: string;
  members: { path: string; sha256: string }[];
}

const HEX64 = /^[0-9a-f]{64}$/i;

/** Đọc mục `pak` của manifest.json; trả null nếu thiếu hoặc sai dạng. Mã băm được hạ thành chữ thường. */
function parsePakManifest(text: string | undefined): PakManifest | null {
  if (text === undefined) return null;
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const pak = raw?.pak;
  if (!pak || typeof pak !== "object" || Array.isArray(pak)) return null;
  if (typeof pak.name !== "string" || typeof pak.sha256 !== "string" || !HEX64.test(pak.sha256)) return null;
  if (!Array.isArray(pak.members) || pak.members.length === 0) return null;
  const members: PakManifest["members"] = [];
  for (const m of pak.members) {
    if (!m || typeof m.path !== "string" || typeof m.sha256 !== "string" || !HEX64.test(m.sha256)) return null;
    members.push({ path: m.path, sha256: m.sha256.toLowerCase() });
  }
  return { name: pak.name, sha256: pak.sha256.toLowerCase(), members };
}

export function checkPackage(input: {
  zipFileName: string;
  entries: ZipEntry[];
  inputHashes: string[];
  rootTexts: Record<string, string>;
}): Block[] {
  const blocks: Block[] = [];
  if (/internal/i.test(input.zipFileName)) {
    blocks.push({ rule: "internal-name", detail: input.zipFileName });
  }
  const originals = new Set(input.inputHashes.map((h) => h.toLowerCase()));
  for (const e of input.entries) {
    if (originals.has(e.sha256.toLowerCase())) blocks.push({ rule: "original-file", detail: e.path });
  }
  const pak = parsePakManifest(input.rootTexts["manifest.json"]);
  for (const e of input.entries) {
    if (!CONTAINER_RE.test(e.path)) continue;
    const bare = e.path.slice(e.path.lastIndexOf("/") + 1);
    if (!pak || !/\.pak$/i.test(bare)) {
      blocks.push({ rule: "container-file", detail: `${e.path}: không có manifest.json mô tả` });
    } else if (bare !== pak.name) {
      blocks.push({ rule: "container-file", detail: `${e.path}: tên không khớp manifest` });
    } else if (e.sha256.toLowerCase() !== pak.sha256) {
      blocks.push({ rule: "container-file", detail: `${e.path}: mã băm không khớp manifest` });
    } else {
      for (const m of pak.members) {
        if (originals.has(m.sha256)) {
          blocks.push({ rule: "container-file", detail: `${e.path}: ${m.path} trùng file gốc của game` });
        }
      }
    }
  }
  for (const [name, text] of Object.entries(input.rootTexts)) {
    if (hasNoDistributeNotice(text)) blocks.push({ rule: "no-distribute-notice", detail: name });
  }
  return blocks;
}
