import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Đọc file .env ở gốc repo (KEY=giá trị, bỏ dòng chú thích, bỏ nháy bao quanh). */
export function readEnvFile(repoRoot: string): Record<string, string> {
  const file = join(repoRoot, ".env");
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    let v = m[2];
    if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

/** Thư mục VH: biến môi trường VH_ROOT, rồi .env, rồi mặc định. */
export function resolveVhRoot(repoRoot: string): string {
  return process.env.VH_ROOT || readEnvFile(repoRoot).VH_ROOT || "D:\\Prjs\\VH";
}
