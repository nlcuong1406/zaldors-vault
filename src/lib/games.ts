import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getCollection, type CollectionEntry } from "astro:content";
import type { Release } from "../../scripts/lib/types";

export const STATUS_LABEL: Record<string, string> = {
  "dang-dich": "Đang dịch",
  "hoan-thanh": "Hoàn thành",
  "tam-dung": "Tạm dừng",
};

function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split(".").map((p) => parseInt(p, 10) || 0);
  const pb = b.split(".").map((p) => parseInt(p, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function loadReleases(id: string, opts: { fixtures?: boolean; root?: string } = {}): Release[] {
  const root = opts.root ?? process.cwd();
  const real = join(root, "src", "data", "releases", `${id}.json`);
  const fixture = join(root, "tests", "fixtures", "releases", `${id}.json`);
  const path = opts.fixtures && existsSync(fixture) ? fixture : real;
  if (!existsSync(path)) return [];
  const releases = JSON.parse(readFileSync(path, "utf8")) as Release[];
  return [...releases].sort((a, b) => compareVersionsDesc(a.version, b.version));
}

export function validateGame(g: { id: string; status: string }, releases: Release[]): void {
  if (g.status === "hoan-thanh" && releases.length === 0) {
    throw new Error(`Game "${g.id}" ghi "hoan-thanh" nhưng chưa có bản phát hành nào.`);
  }
}

export async function getGames(): Promise<
  Array<{ entry: CollectionEntry<"games">; releases: Release[]; latest: Release | null }>
> {
  const fixtures = process.env.VAULT_FIXTURES === "1";
  const entries = await getCollection("games");
  const games = entries.map((entry) => {
    const releases = loadReleases(entry.data.id, { fixtures });
    validateGame(entry.data, releases);
    return { entry, releases, latest: releases[0] ?? null };
  });
  return games.sort((a, b) => {
    const hasA = a.latest ? 1 : 0;
    const hasB = b.latest ? 1 : 0;
    if (hasA !== hasB) return hasB - hasA;
    return b.entry.data.progress - a.entry.data.progress;
  });
}
