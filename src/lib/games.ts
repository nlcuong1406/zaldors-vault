import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getCollection, type CollectionEntry } from "astro:content";
import { stripBom } from "../../scripts/lib/text";
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

function parseReleases(path: string): Release[] {
  const bad = (what: string): never => {
    throw new Error(`${path}: ${what}`);
  };
  let data: unknown;
  try {
    data = JSON.parse(stripBom(readFileSync(path, "utf8")));
  } catch (e) {
    return bad(`JSON hỏng (${(e as Error).message})`);
  }
  if (!Array.isArray(data)) return bad("phải là một mảng");
  data.forEach((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const at = `mục ${i + 1}`;
    const str = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
    if (!/^\d+(\.\d+)*$/.test(str("version"))) bad(`${at}: trường version không hợp lệ`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str("date"))) bad(`${at}: trường date phải dạng YYYY-MM-DD`);
    if (str("fileName").trim() === "") bad(`${at}: trường fileName trống`);
    if (typeof r.sizeBytes !== "number" || !Number.isFinite(r.sizeBytes) || r.sizeBytes < 0) {
      bad(`${at}: trường sizeBytes phải là số không âm`);
    }
    if (!/^[0-9a-f]{64}$/.test(str("sha256"))) bad(`${at}: trường sha256 phải gồm 64 ký tự hex thường`);
    if (!str("url").startsWith("https://")) bad(`${at}: trường url phải bắt đầu bằng https://`);
    if (str("gameBuild").trim() === "") bad(`${at}: trường gameBuild trống`);
    if (typeof r.notes !== "string") bad(`${at}: trường notes phải là chuỗi`);
  });
  return data as Release[];
}

export function loadReleases(id: string, opts: { fixtures?: boolean; root?: string } = {}): Release[] {
  const root = opts.root ?? process.cwd();
  const real = join(root, "src", "data", "releases", `${id}.json`);
  const fixture = join(root, "tests", "fixtures", "releases", `${id}.json`);
  const path = opts.fixtures && existsSync(fixture) ? fixture : real;
  if (!existsSync(path)) return [];
  const releases = parseReleases(path);
  return [...releases].sort((a, b) => compareVersionsDesc(a.version, b.version));
}

export function validateGame(g: { id: string; status: string }, releases: Release[]): void {
  if (g.status === "hoan-thanh" && releases.length === 0) {
    throw new Error(`Game "${g.id}" ghi "hoan-thanh" nhưng chưa có bản phát hành nào.`);
  }
}

export function useFixtures(env: Record<string, string | undefined>): boolean {
  const on = env.VAULT_FIXTURES === "1";
  if (on && env.CF_PAGES) {
    throw new Error(
      "VAULT_FIXTURES=1 đang bật trong lúc build trên Cloudflare Pages: dữ liệu mẫu không được dùng cho bản build thật. Xóa biến VAULT_FIXTURES khỏi cài đặt Cloudflare Pages.",
    );
  }
  return on;
}

export async function getGames(): Promise<
  Array<{ entry: CollectionEntry<"games">; releases: Release[]; latest: Release | null }>
> {
  const fixtures = useFixtures(process.env);
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
