import { foldVietnamese } from "./text";
import type { ZipEntry } from "./types";

export interface Block {
  rule: "internal-name" | "original-file" | "no-distribute-notice";
  detail: string;
}

const NOTICES = ["khong phan phoi", "noi bo"];

function normalise(text: string): string {
  return foldVietnamese(text).replace(/[\s ]+/g, " ");
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
  for (const [name, text] of Object.entries(input.rootTexts)) {
    const t = normalise(text);
    if (NOTICES.some((n) => t.includes(n))) blocks.push({ rule: "no-distribute-notice", detail: name });
  }
  return blocks;
}
