import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, expect, test } from "vitest";
import { parse } from "yaml";
import { runSync } from "../../scripts/sync";
import { cleanupFakeVh, makeFakeVh } from "../helpers/fake-vh";

afterAll(cleanupFakeVh);

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function front(path: string): any {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, "utf8"));
  return parse(m![1]);
}

function snapshotTree(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[p] = `${statSync(p).size}:${readFileSync(p).toString("hex")}`;
    }
  };
  walk(root);
  return out;
}

let vhRoot: string;
let repoRoot: string;
let mdPath: string;

beforeEach(async () => {
  vhRoot = await makeFakeVh({
    "game-a": {
      projectJson: { id: "game-a", title: "Game A: The \"Quote\"", platform: "PC", edition: "USA", inputs: [] },
      zips: { "G-v1.0.zip": { "a.txt": "1" }, "G-v1.1.zip": { "a.txt": "2" } },
      extraFiles: { "release/notes.txt": "không phải zip" },
    },
    "game-b": { projectJson: { id: "game-b", title: "Game B", platform: "3DS", edition: "EUR" } },
  });
  repoRoot = mkdtempSync(join(tmpdir(), "vault-sync-"));
  dirs.push(repoRoot);
  mkdirSync(join(repoRoot, "src/content/games"), { recursive: true });
  mkdirSync(join(repoRoot, "src/data/releases"), { recursive: true });
  mdPath = join(repoRoot, "src/content/games/game-a.md");
  writeFileSync(
    join(repoRoot, "src/data/releases/game-a.json"),
    JSON.stringify([{ version: "1.0", date: "2026-01-01", fileName: "G-v1.0.zip", sizeBytes: 1, sha256: "a".repeat(64), url: "u", gameBuild: "1", notes: "" }]) + "\n",
  );
});

test("tạo file cho game mới từ project.json", () => {
  const r = runSync({ vhRoot, repoRoot });
  expect(r.created).toEqual(["game-a", "game-b"]);
  expect(front(mdPath)).toMatchObject({
    id: "game-a", title: 'Game A: The "Quote"', platform: "PC", edition: "USA", status: "dang-dich", progress: 0,
    tagline: "Chưa có giới thiệu.",
    credits: [{ name: "Zaldor (Vergilize)", role: "Dịch và kỹ thuật" }],
  });
  const text = readFileSync(mdPath, "utf8");
  expect(text).toContain("## Giới thiệu\n\nChưa có nội dung.\n");
  expect(text).toContain("## Hướng dẫn cài đặt\n\nChưa có nội dung.\n");
  expect(readFileSync(join(repoRoot, "src/data/releases/game-b.json"), "utf8")).toBe("[]\n");
});

test("không ghi đè kho đã có", () => {
  const before = readFileSync(join(repoRoot, "src/data/releases/game-a.json"));
  runSync({ vhRoot, repoRoot });
  expect(readFileSync(join(repoRoot, "src/data/releases/game-a.json")).equals(before)).toBe(true);
});

test("chạy lại không đổi byte nào", () => {
  runSync({ vhRoot, repoRoot });
  const before = readFileSync(mdPath);
  const r = runSync({ vhRoot, repoRoot });
  expect(r.created).toEqual([]);
  expect(r.filled).toEqual([]);
  expect(readFileSync(mdPath).equals(before)).toBe(true);
});

test("không ghi đè trường đã sửa tay, chỉ điền trường trống", () => {
  runSync({ vhRoot, repoRoot });
  let text = readFileSync(mdPath, "utf8");
  text = text.replace(/^title: .*$/m, "title: Tên Tôi Đặt").replace(/^edition: .*$/m, 'edition: ""');
  writeFileSync(mdPath, text);
  const r = runSync({ vhRoot, repoRoot });
  expect(r.filled).toEqual([{ id: "game-a", fields: ["edition"] }]);
  expect(front(mdPath).title).toBe("Tên Tôi Đặt");
  expect(front(mdPath).edition).toBe("USA");
  expect(readFileSync(mdPath, "utf8").replace(/^edition: .*$/m, "")).toBe(text.replace(/^edition: .*$/m, ""));
});

test("điền trường vắng mặt, giữ CRLF và phần còn lại", () => {
  const original = "---\r\nid: game-a\r\ntitle: Giữ\r\nstatus: tam-dung\r\nprogress: 5\r\ntagline: x\r\n---\r\n\r\nThân bài.\r\n";
  writeFileSync(mdPath, original);
  const r = runSync({ vhRoot, repoRoot });
  expect(r.filled).toEqual([{ id: "game-a", fields: ["platform", "edition"] }]);
  const after = readFileSync(mdPath, "utf8");
  expect(after).toBe(
    "---\r\nid: game-a\r\nplatform: \"PC\"\r\nedition: \"USA\"\r\ntitle: Giữ\r\nstatus: tam-dung\r\nprogress: 5\r\ntagline: x\r\n---\r\n\r\nThân bài.\r\n",
  );
  expect(front(mdPath)).toMatchObject({ platform: "PC", edition: "USA", title: "Giữ" });
});

test("liệt kê zip chưa phát hành", () => {
  expect(runSync({ vhRoot, repoRoot }).unpublished).toEqual([{ id: "game-a", zip: "G-v1.1.zip" }]);
});

test("game mồ côi và dự án hỏng không làm sập", async () => {
  writeFileSync(join(repoRoot, "src/content/games/cu.md"), "---\nid: cu\n---\n");
  writeFileSync(join(vhRoot, "projects/game-b/project.json"), "{ hỏng");
  const r = runSync({ vhRoot, repoRoot });
  expect(r.orphans).toEqual(["cu"]);
  expect(r.errors.map((e) => e.id)).toEqual(["game-b"]);
  expect(r.created).toContain("game-a");
  expect(existsSync(join(repoRoot, "src/content/games/game-b.md"))).toBe(false);
});

test("thiếu thư mục projects thì lỗi rõ ràng, không ghi gì", () => {
  const empty = mkdtempSync(join(tmpdir(), "vault-novh-"));
  dirs.push(empty);
  expect(() => runSync({ vhRoot: empty, repoRoot })).toThrow(/Không tìm thấy thư mục projects trong VH_ROOT=/);
});

test("không ghi gì vào VH", () => {
  const snap = snapshotTree(vhRoot);
  runSync({ vhRoot, repoRoot });
  expect(snapshotTree(vhRoot)).toEqual(snap);
});
