import { existsSync, readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import config from "../vault.config";
import { resolveVhRoot } from "./lib/env";
import { assetUrl, createRelease, getExistingAssetSha, ghRunner, releaseTag, type Runner } from "./lib/github";
import { checkPackage, type Block } from "./lib/guard";
import { parseSha256File, sha256File } from "./lib/hash";
import { resolveReleaseInfo } from "./lib/release-info";
import { upsertRelease } from "./lib/releases-store";
import type { Release } from "./lib/types";
import { findReleaseZip, loadProject } from "./lib/vh";
import { listEntries, readRootTexts } from "./lib/zip";

export type Outcome = "blocked" | "preview" | "published" | "resumed";

const VERSION_RE = /^\d+(\.\d+)*$/;

function humanSize(n: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return i === 0 ? `${n} B` : `${v.toFixed(2)} ${units[i]}`;
}

export async function runRelease(opts: {
  vhRoot: string;
  repoRoot: string;
  repo: string | null;
  id: string;
  version: string;
  notesFileText: string | null;
  gameBuildFlag: string | null;
  confirm: boolean;
  today: string;
  run: Runner;
  log: (line: string) => void;
}): Promise<{ outcome: Outcome; blocks: Block[]; release: Release | null }> {
  const { vhRoot, repoRoot, repo, id, version, run, log } = opts;
  if (!VERSION_RE.test(version)) {
    throw new Error(`Phiên bản "${version}" không hợp lệ: chỉ nhận số và dấu chấm, ví dụ 0.9.1.`);
  }

  // 1. Tìm dự án và file zip.
  const project = loadProject(vhRoot, id);
  const zipPath = findReleaseZip(project, version);
  const fileName = basename(zipPath);

  // 2. Chặn cứng.
  const entries = await listEntries(zipPath);
  const rootTexts = await readRootTexts(zipPath, entries);
  const blocks = checkPackage({ zipFileName: fileName, entries, inputHashes: project.inputHashes, rootTexts });
  if (blocks.length > 0) {
    log(`Gói ${fileName} bị chặn, không phát hành:`);
    for (const b of blocks) log(`  [${b.rule}] ${b.detail}`);
    log("Muốn công khai bản này thì đóng gói lại bên VH.");
    return { outcome: "blocked", blocks, release: null };
  }

  // 3. Mã băm và file .sha256 bên cạnh.
  const sha256 = await sha256File(zipPath);
  const sidecar = `${zipPath}.sha256`;
  if (existsSync(sidecar)) {
    const expected = parseSha256File(readFileSync(sidecar, "utf8"));
    if (expected === null) {
      throw new Error(`Không đọc được mã băm trong ${basename(sidecar)}; coi như lệch. Kiểm tra lại file này bên VH.`);
    }
    if (expected !== sha256) {
      throw new Error(`Lệch mã băm: ${basename(sidecar)} ghi ${expected}, nhưng file zip tính ra ${sha256}.`);
    }
  }

  // 4. Thông tin bản phát hành.
  const info = resolveReleaseInfo({
    notesFileText: opts.notesFileText,
    gameBuildFlag: opts.gameBuildFlag,
    rootTexts,
    today: opts.today,
  });

  // 5. Tóm tắt.
  const sizeBytes = statSync(zipPath).size;
  log(`File: ${fileName}`);
  log(`Dung lượng: ${humanSize(sizeBytes)} (${sizeBytes} byte)`);
  log(`SHA-256: ${sha256}`);
  log(`Số file trong gói: ${entries.length}`);
  log("20 file lớn nhất:");
  [...entries]
    .sort((a, b) => b.sizeBytes - a.sizeBytes || (a.path < b.path ? -1 : 1))
    .slice(0, 20)
    .forEach((e) => log(`  ${e.path}  ${humanSize(e.sizeBytes)} (${e.sizeBytes} byte)`));
  log(`Ngày: ${info.date}`);
  log(`Bản game: ${info.gameBuild}`);
  log("Ghi chú:");
  info.notes.split("\n").forEach((l) => log(`  ${l}`));
  if (!opts.confirm) {
    log("");
    log("Đây mới là bản xem trước, chưa có gì được tải lên hay ghi lại.");
    log(`Để phát hành, chạy lại lệnh này kèm --confirm.`);
    return { outcome: "preview", blocks: [], release: null };
  }

  // 6. Kiểm tra tag trên GitHub.
  if (repo === null) {
    throw new Error("Chưa cấu hình repo GitHub: điền `repo` trong vault.config.ts (dạng chu-so-huu/ten-repo).");
  }
  const tag = releaseTag(id, version);
  const existing = await getExistingAssetSha(run, repo, tag, fileName);
  let outcome: Outcome;
  if (existing === "no-release") {
    // 7. Tạo release và tải file lên.
    await createRelease(run, { repo, tag, title: `${project.title} – Việt hóa v${version}`, notes: info.notes, zipPath });
    outcome = "published";
  } else if (existing === sha256) {
    log(`Release ${tag} đã có file giống hệt, bỏ qua bước tải lên và ghi tiếp vào kho.`);
    outcome = "resumed";
  } else {
    throw new Error(
      `Tag ${tag} đã tồn tại trên GitHub` +
        (existing === null ? ` nhưng không có file ${fileName}.` : ` với file khác (mã băm ${existing}, bản này ${sha256}).`) +
        " Bản đã phát hành không bị ghi đè; nếu sửa lỗi thì ra số phiên bản mới.",
    );
  }

  // 8. Ghi kho.
  const release: Release = {
    version,
    date: info.date,
    fileName,
    sizeBytes,
    sha256,
    url: assetUrl(repo, tag, fileName),
    gameBuild: info.gameBuild,
    notes: info.notes,
  };
  upsertRelease(repoRoot, id, release);

  // 9. Hướng dẫn bước tiếp theo, không tự chạy git.
  log("");
  log(outcome === "published" ? `Đã phát hành ${tag}.` : `Đã ghi lại ${tag} vào kho.`);
  log("Chạy tiếp các lệnh sau để đưa lên trang:");
  log(`  git add src/data/releases/${id}.json`);
  log(`  git commit -m "release: ${id} v${version}"`);
  log("  git push");
  return { outcome, blocks: [], release };
}

export interface ParsedArgs {
  id: string;
  version: string;
  notes: string | null;
  gameBuild: string | null;
  confirm: boolean;
}

export const USAGE =
  "Cách dùng: npm run release -- <id> <version> [--notes <file>] [--game-build <chuỗi>] [--confirm]";

export function parseArgs(argv: string[]): ParsedArgs | { error: string } {
  const positional: string[] = [];
  let notes: string | null = null;
  let gameBuild: string | null = null;
  let confirm = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--confirm") {
      if (confirm) return { error: "Cờ --confirm bị lặp." };
      confirm = true;
    } else if (a === "--notes" || a === "--game-build") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) return { error: `Cờ ${a} cần một giá trị.` };
      i++;
      if (a === "--notes") {
        if (notes !== null) return { error: "Cờ --notes bị lặp." };
        notes = v;
      } else {
        if (gameBuild !== null) return { error: "Cờ --game-build bị lặp." };
        gameBuild = v;
      }
    } else if (a.startsWith("--")) {
      return { error: `Tham số lạ: ${a}` };
    } else {
      positional.push(a);
    }
  }
  if (positional.length !== 2) return { error: "Cần đúng hai tham số: <id> và <version>." };
  const [id, version] = positional;
  if (!VERSION_RE.test(version)) return { error: `Phiên bản "${version}" không hợp lệ: chỉ nhận số và dấu chấm, ví dụ 0.9.1.` };
  return { id, version, notes, gameBuild, confirm };
}

function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    console.error(parsed.error);
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  const repoRoot = process.cwd();
  try {
    const notesFileText = parsed.notes === null ? null : readFileSync(parsed.notes, "utf8");
    const r = await runRelease({
      vhRoot: resolveVhRoot(repoRoot),
      repoRoot,
      repo: config.repo,
      id: parsed.id,
      version: parsed.version,
      notesFileText,
      gameBuildFlag: parsed.gameBuild,
      confirm: parsed.confirm,
      today: localDate(),
      run: ghRunner,
      log: (l) => console.log(l),
    });
    if (r.outcome === "blocked") process.exitCode = 1;
  } catch (e) {
    console.error(`Lỗi: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
