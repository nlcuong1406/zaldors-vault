import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readStore } from "./lib/releases-store";
import { listProjectIds, loadProject } from "./lib/vh";

export interface SyncResult {
  created: string[];
  filled: Array<{ id: string; fields: string[] }>;
  unpublished: Array<{ id: string; zip: string }>;
  orphans: string[];
  errors: Array<{ id: string; message: string }>;
}

const FILL_FIELDS = ["title", "platform", "edition"] as const;

/** JSON.stringify cho ra chuỗi YAML hợp lệ (dấu nháy kép, thoát ký tự). */
const q = (s: string) => JSON.stringify(s);

function newMarkdown(p: { id: string; title: string; platform: string; edition: string }): string {
  return [
    "---",
    `id: ${q(p.id)}`,
    `title: ${q(p.title)}`,
    `platform: ${q(p.platform)}`,
    `edition: ${q(p.edition)}`,
    "status: dang-dich",
    "progress: 0",
    `tagline: ${q("Chưa có giới thiệu.")}`,
    "credits:",
    `  - name: ${q("Zaldor (Vergilize)")}`,
    `    role: ${q("Dịch và kỹ thuật")}`,
    "---",
    "",
    "## Giới thiệu",
    "",
    "Chưa có nội dung.",
    "",
    "## Hướng dẫn cài đặt",
    "",
    "Chưa có nội dung.",
    "",
  ].join("\n");
}

function isEmptyValue(raw: string): boolean {
  const v = raw.trim();
  return v === "" || v === '""' || v === "''" || v === "~" || v === "null";
}

/** Điền các trường trống bằng cách sửa đúng dòng trong khối đầu file. Trả về nội dung mới và các trường đã điền. */
function fillFrontMatter(text: string, values: Record<string, string>): { text: string; fields: string[] } {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(eol);
  if (lines[0] !== "---") return { text, fields: [] };
  if (lines.indexOf("---", 1) < 0) return { text, fields: [] };
  const fields: string[] = [];
  let insertAt = -1; // vị trí chèn kế tiếp, giữ thứ tự các trường vừa chèn
  for (const f of FILL_FIELDS) {
    if (!values[f]) continue; // VH cũng trống: không có gì để điền
    const end = lines.indexOf("---", 1);
    const re = new RegExp(`^${f}:(.*)$`);
    let idx = -1;
    let m: RegExpExecArray | null = null;
    for (let i = 1; i < end && !m; i++) {
      m = re.exec(lines[i]);
      if (m) idx = i;
    }
    if (idx >= 0) {
      if (!isEmptyValue(m![1])) continue;
      lines[idx] = `${f}: ${q(values[f])}`;
    } else {
      if (insertAt < 0) {
        insertAt = 1;
        for (let i = 1; i < end; i++) if (/^id:/.test(lines[i])) insertAt = i + 1;
      }
      lines.splice(insertAt++, 0, `${f}: ${q(values[f])}`);
    }
    fields.push(f);
  }
  return { text: lines.join(eol), fields };
}

function listZips(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.zip$/i.test(e.name))
    .map((e) => e.name)
    .sort();
}

export function runSync(opts: { vhRoot: string; repoRoot: string }): SyncResult {
  const { vhRoot, repoRoot } = opts;
  const gamesDir = join(repoRoot, "src", "content", "games");
  const storeDir = join(repoRoot, "src", "data", "releases");
  const result: SyncResult = { created: [], filled: [], unpublished: [], orphans: [], errors: [] };
  mkdirSync(gamesDir, { recursive: true });

  const ids = listProjectIds(vhRoot);
  for (const id of ids) {
    try {
      const project = loadProject(vhRoot, id);
      const md = join(gamesDir, `${id}.md`);
      if (!existsSync(md)) {
        writeFileSync(md, newMarkdown({ id, title: project.title, platform: project.platform, edition: project.edition }), "utf8");
        result.created.push(id);
      } else {
        const before = readFileSync(md, "utf8");
        const { text, fields } = fillFrontMatter(before, {
          title: project.title,
          platform: project.platform,
          edition: project.edition,
        });
        if (fields.length > 0) {
          writeFileSync(md, text, "utf8");
          result.filled.push({ id, fields });
        }
      }
      const store = join(storeDir, `${id}.json`);
      if (!existsSync(store)) {
        mkdirSync(storeDir, { recursive: true });
        writeFileSync(store, "[]\n", "utf8");
      }
      const published = new Set(readStore(repoRoot, id).map((r) => r.fileName));
      for (const zip of listZips(project.releaseDir)) {
        if (!published.has(zip)) result.unpublished.push({ id, zip });
      }
    } catch (e) {
      result.errors.push({ id, message: (e as Error).message });
    }
  }

  const known = new Set(ids);
  for (const f of readdirSync(gamesDir).sort()) {
    if (!f.endsWith(".md")) continue;
    const base = f.slice(0, -3);
    if (!known.has(base)) result.orphans.push(base);
  }
  return result;
}

function readEnvFile(repoRoot: string): Record<string, string> {
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

function main(): void {
  const repoRoot = process.cwd();
  const vhRoot = process.env.VH_ROOT || readEnvFile(repoRoot).VH_ROOT || "D:\\Prjs\\VH";
  const r = runSync({ vhRoot, repoRoot });
  console.log(`Thư mục VH: ${vhRoot}`);
  console.log(`\nĐã tạo file game (${r.created.length}):`);
  r.created.forEach((id) => console.log(`  ${id}`));
  console.log(`\nĐã điền trường trống (${r.filled.length}):`);
  r.filled.forEach((f) => console.log(`  ${f.id}: ${f.fields.join(", ")}`));
  console.log(`\nZip chưa phát hành (${r.unpublished.length}):`);
  r.unpublished.forEach((u) => console.log(`  ${u.id}: ${u.zip}`));
  console.log(`\nGame không còn dự án bên VH (${r.orphans.length}):`);
  r.orphans.forEach((id) => console.log(`  ${id}`));
  if (r.errors.length > 0) {
    console.log(`\nLỗi (${r.errors.length}):`);
    r.errors.forEach((e) => console.log(`  ${e.id}: ${e.message}`));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
