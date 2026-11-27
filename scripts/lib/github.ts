/**
 * Các lời gọi GitHub CLI (gh) mà kho này dùng. Đối chiếu với tài liệu chính thức
 * https://cli.github.com/manual/gh_release_view và gh_release_create (kiểm tra 2026-11-27).
 *
 * 1. Xem release đã có chưa, và mã băm file đã tải lên:
 *      gh release view <tag> --repo <chủ/repo> --json assets,isDraft
 *    `isDraft` cũng có trong danh sách trường của gh: bản nháp (tải lên dở dang) bị từ chối.
 *    Trường JSON `assets` có trong danh sách của gh. Tài liệu không mô tả cấu trúc bên
 *    trong; ta dựa vào assets[].name và assets[].digest (dạng "sha256:<hex>") như API
 *    GitHub trả về. Thiếu digest thì không kiểm chứng được, nên ném lỗi.
 *    Tag chưa có release: gh thoát khác 0 và stderr chứa "release not found". Tài liệu
 *    không ghi mã thoát; chỉ chuỗi đó mới được coi là "no-release". Mọi lỗi khác
 *    (mạng, quyền, chưa đăng nhập) đều ném lỗi.
 *
 * 2. Tạo release và tải file lên:
 *      gh release create <tag> <file.zip> --repo <chủ/repo> --title <tiêu đề> --notes-file <file>
 *    `-t/--title`, `-F/--notes-file`, `-R/--repo` đúng theo tài liệu. Đối số vị trí là
 *    <tag> rồi các file tài sản. Hậu tố "#nhãn" sau tên file là nhãn hiển thị, nên
 *    đường dẫn chứa "#" bị từ chối. Khi tag chưa có, gh tự tạo tag từ nhánh mặc định.
 *    Khi có file đính kèm, gh tạo bản nháp, tải từng file rồi mới công bố; các bước này
 *    không nguyên tử, nên chạy lại lệnh release sẽ đi theo nhánh "resumed" ở bước 6.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type Runner = (cmd: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>;

export function releaseTag(id: string, version: string): string {
  return `${id}-v${version}`;
}

export function assetUrl(repo: string, tag: string, fileName: string): string {
  return `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(fileName)}`;
}

export async function getExistingAssetSha(
  run: Runner,
  repo: string,
  tag: string,
  fileName: string,
): Promise<string | null | "no-release"> {
  const r = await run("gh", ["release", "view", tag, "--repo", repo, "--json", "assets,isDraft"]);
  if (r.code !== 0) {
    if (/release not found/i.test(r.stderr)) return "no-release";
    throw new Error(`gh release view thất bại (mã ${r.code}): ${r.stderr.trim() || r.stdout.trim() || "không có thông báo"}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    throw new Error("gh release view trả về dữ liệu không phải JSON.");
  }
  const isDraft = (parsed as { isDraft?: unknown } | null)?.isDraft;
  if (typeof isDraft !== "boolean") throw new Error("gh release view không trả về trường isDraft, không kiểm chứng được.");
  if (isDraft) {
    throw new Error(`Release ${tag} đang là bản nháp; công bố hoặc xóa tay trên GitHub rồi chạy lại.`);
  }
  const assets = (parsed as { assets?: unknown } | null)?.assets;
  if (!Array.isArray(assets)) throw new Error("gh release view không trả về danh sách assets.");
  const hit = assets.find((a) => (a as { name?: unknown } | null)?.name === fileName) as { digest?: unknown } | undefined;
  if (!hit) return null;
  const m = typeof hit.digest === "string" ? /^sha256:([0-9a-f]{64})$/i.exec(hit.digest.trim()) : null;
  if (!m) {
    throw new Error(`File "${fileName}" đã có trên release ${tag} nhưng gh không trả digest sha256 hợp lệ, không kiểm chứng được.`);
  }
  return m[1].toLowerCase();
}

export async function createRelease(
  run: Runner,
  input: { repo: string; tag: string; title: string; notes: string; zipPath: string },
): Promise<void> {
  if (input.zipPath.includes("#")) {
    throw new Error(`Đường dẫn zip chứa "#", gh sẽ hiểu là nhãn tài sản: ${input.zipPath}`);
  }
  const dir = mkdtempSync(join(tmpdir(), "vault-notes-"));
  try {
    const notesFile = join(dir, "notes.md");
    writeFileSync(notesFile, input.notes, "utf8");
    const r = await run("gh", [
      "release", "create", input.tag, input.zipPath,
      "--repo", input.repo,
      "--title", input.title,
      "--notes-file", notesFile,
    ]);
    if (r.code !== 0) {
      throw new Error(`gh release create thất bại (mã ${r.code}): ${r.stderr.trim() || r.stdout.trim() || "không có thông báo"}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Runner thật: gọi gh không qua shell. */
export const ghRunner: Runner = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (d: Buffer) => out.push(d));
    child.stderr.on("data", (d: Buffer) => err.push(d));
    child.on("error", (e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") reject(new Error("Chưa cài GitHub CLI (gh). Cài gh và chạy `gh auth login` rồi thử lại."));
      else reject(e);
    });
    child.on("close", (code) =>
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      }),
    );
  });
