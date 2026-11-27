import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { stripBom } from "./text";
import type { VhProject } from "./types";

export function listProjectIds(vhRoot: string): string[] {
  const dir = join(vhRoot, "projects");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "project.json")))
    .map((e) => e.name)
    .sort();
}

export function loadProject(vhRoot: string, id: string): VhProject {
  const projectDir = join(vhRoot, "projects", id);
  const file = join(projectDir, "project.json");
  if (!existsSync(file)) throw new Error(`Dự án "${id}": thiếu project.json (${file})`);
  let raw: any;
  try {
    raw = JSON.parse(stripBom(readFileSync(file, "utf8")));
  } catch (e) {
    throw new Error(`Dự án "${id}": project.json hỏng (${(e as Error).message})`);
  }
  const inputs: unknown[] = Array.isArray(raw?.inputs) ? raw.inputs : [];
  const inputHashes = inputs
    .map((i) => (i as { sha256?: unknown } | null)?.sha256)
    .filter((h): h is string => typeof h === "string" && h.length > 0)
    .map((h) => h.toLowerCase());
  return {
    id: String(raw?.id ?? id),
    title: String(raw?.title ?? ""),
    platform: String(raw?.platform ?? ""),
    edition: String(raw?.edition ?? ""),
    inputHashes,
    releaseDir: resolve(projectDir, "release"),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Tên (không kèm đường dẫn) các file *.zip thường trong thư mục release, sắp a-z. Thiếu thư mục thì trả []. */
export function listReleaseZips(releaseDir: string): string[] {
  if (!existsSync(releaseDir)) return [];
  return readdirSync(releaseDir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.zip$/i.test(e.name))
    .map((e) => e.name)
    .sort();
}

export function findReleaseZip(project: VhProject, version: string): string {
  if (!version.trim()) throw new Error(`Dự án "${project.id}": phiên bản trống`);
  const names = listReleaseZips(project.releaseDir);
  const re = new RegExp(`(?<![A-Za-z0-9])v${escapeRegex(version)}(?!\\d|\\.\\d)`);
  const hits = names.filter((n) => re.test(n));
  if (hits.length === 0) {
    throw new Error(`Dự án "${project.id}": không tìm thấy file zip cho phiên bản ${version} trong ${project.releaseDir}`);
  }
  if (hits.length > 1) {
    const publicHits = hits.filter((n) => !/internal/i.test(n));
    if (publicHits.length === 1) return join(project.releaseDir, publicHits[0]);
    throw new Error(`Dự án "${project.id}": có nhiều hơn một file zip cho phiên bản ${version}: ${hits.join(", ")}`);
  }
  return join(project.releaseDir, hits[0]);
}
