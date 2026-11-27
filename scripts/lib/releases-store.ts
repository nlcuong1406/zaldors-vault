import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stripBom } from "./text";
import type { Release } from "./types";

function storeFile(repoRoot: string, id: string): string {
  return join(repoRoot, "src", "data", "releases", `${id}.json`);
}

export function readStore(repoRoot: string, id: string): Release[] {
  const file = storeFile(repoRoot, id);
  if (!existsSync(file)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripBom(readFileSync(file, "utf8")));
  } catch (e) {
    throw new Error(`Không đọc được kho bản phát hành ${file}: JSON hỏng (${(e as Error).message})`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Kho bản phát hành ${file} không phải mảng JSON.`);
  }
  return parsed as Release[];
}

export function upsertRelease(repoRoot: string, id: string, r: Release): Release[] {
  const current = readStore(repoRoot, id);
  const i = current.findIndex((x) => x.version === r.version);
  const next = i >= 0 ? current.map((x, j) => (j === i ? r : x)) : [...current, r];
  const file = storeFile(repoRoot, id);
  mkdirSync(join(repoRoot, "src", "data", "releases"), { recursive: true });
  writeFileSync(file, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}
