import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { sha256File } from "../../scripts/lib/hash";
import type { Runner } from "../../scripts/lib/github";
import { readStore } from "../../scripts/lib/releases-store";
import { parseArgs, runRelease } from "../../scripts/release";
import { cleanupFakeVh, makeFakeVh } from "../helpers/fake-vh";

const dirs: string[] = [];
afterAll(async () => {
  dirs.forEach((d) => rmSync(d, { recursive: true, force: true }));
  await cleanupFakeVh();
});

const LAD8_ZIP = "LAD8-VietHoa-v0.9.1.zip";
const wrongSha = "00".repeat(32);

let vhRoot: string;
let repoRoot: string;
let lad8Sha: string;
let calls: Array<{ cmd: string; args: string[] }>;
let logs: string[];
let handler: (args: string[]) => { code: number; stdout: string; stderr: string };
let base: Parameters<typeof runRelease>[0];

const ok = (stdout = "") => ({ code: 0, stdout, stderr: "" });
const notFound = () => ({ code: 1, stdout: "", stderr: "release not found" });
const viewWith = (digest: string | undefined) =>
  ok(JSON.stringify({ assets: [{ name: LAD8_ZIP, ...(digest ? { digest: `sha256:${digest}` } : {}) }] }));

beforeAll(async () => {
  vhRoot = await makeFakeVh({
    lad8: {
      projectJson: { id: "lad8", title: "Like a Dragon: Infinite Wealth", platform: "PC", edition: "Steam", inputs: [{ path: "orig.bin", sha256: "ff".repeat(32) }] },
      zips: {
        [LAD8_ZIP]: {
          "LAD8-VietHoa-v0.9.1/PHAT-HANH.txt": "Bản Việt hóa đầu tiên.",
          "LAD8-VietHoa-v0.9.1/manifest.json": JSON.stringify({ version: "0.9.1", date: "2026-11-27", game: { build: "17233673" } }),
          "LAD8-VietHoa-v0.9.1/data/text.bin": "dữ liệu",
        },
      },
    },
    sb: {
      projectJson: { id: "sb", title: "Stellar Blade", platform: "PC", edition: "Steam", inputs: [] },
      zips: { "SB-VH-v0.3-internal.zip": { "README.txt": "(NOI BO, KHONG PHAN PHOI)" } },
    },
    lech: {
      projectJson: { id: "lech", title: "Lệch", platform: "PC", edition: "Steam", inputs: [] },
      zips: {
        "LECH-v1.0.zip": { "LECH/PHAT-HANH.txt": "ghi chú", "LECH/manifest.json": JSON.stringify({ game: { build: "1" } }), "LECH/a.bin": "x" },
        "LECH2-v2.0.zip": { "LECH2/PHAT-HANH.txt": "ghi chú", "LECH2/manifest.json": JSON.stringify({ game: { build: "1" } }), "LECH2/a.bin": "x" },
      },
    },
  });
  const rel = (id: string, name: string) => join(vhRoot, "projects", id, "release", name);
  lad8Sha = await sha256File(rel("lad8", LAD8_ZIP));
  writeFileSync(rel("lad8", LAD8_ZIP + ".sha256"), `${lad8Sha}  ${LAD8_ZIP}\n`, "utf8");
  writeFileSync(rel("lech", "LECH-v1.0.zip.sha256"), `${wrongSha}  LECH-v1.0.zip\n`, "utf8");
  writeFileSync(rel("lech", "LECH2-v2.0.zip.sha256"), "không có mã băm\n", "utf8");
});

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), "vault-repo-"));
  dirs.push(repoRoot);
  mkdirSync(join(repoRoot, "src", "data", "releases"), { recursive: true });
  calls = [];
  logs = [];
  handler = () => ok();
  const run: Runner = async (cmd, args) => {
    calls.push({ cmd, args });
    return handler(args);
  };
  base = {
    vhRoot,
    repoRoot,
    repo: "chu/kho",
    id: "lad8",
    version: "0.9.1",
    notesFileText: null,
    gameBuildFlag: null,
    confirm: true,
    today: "2026-12-01",
    run,
    log: (l) => logs.push(l),
  };
});

test("gói bị chặn: không gọi gh, không ghi kho", async () => {
  const r = await runRelease({ ...base, id: "sb", version: "0.3", confirm: true });
  expect(r.outcome).toBe("blocked");
  expect(r.blocks.map((b) => b.rule)).toEqual(expect.arrayContaining(["internal-name", "no-distribute-notice"]));
  expect(calls).toEqual([]);
  expect(readStore(repoRoot, "sb")).toEqual([]);
  expect(logs.join("\n")).toContain("internal-name");
});

test("không có --confirm thì chỉ xem trước", async () => {
  const r = await runRelease({ ...base, confirm: false });
  expect(r.outcome).toBe("preview");
  expect(calls).toEqual([]);
  expect(readStore(repoRoot, "lad8")).toEqual([]);
  const out = logs.join("\n");
  expect(out).toContain(LAD8_ZIP);
  expect(out).toContain(lad8Sha);
  expect(out).toContain("17233673");
  expect(out).toContain("--confirm");
});

test("xem trước chạy được khi repo chưa cấu hình", async () => {
  const r = await runRelease({ ...base, repo: null, confirm: false });
  expect(r.outcome).toBe("preview");
});

test("file .sha256 lệch thì dừng trước khi tải", async () => {
  await expect(runRelease({ ...base, id: "lech", version: "1.0" })).rejects.toThrow(/mã băm/);
  expect(calls).toEqual([]);
});

test("file .sha256 không đọc được mã băm thì coi là lệch", async () => {
  await expect(runRelease({ ...base, id: "lech", version: "2.0" })).rejects.toThrow(/mã băm/);
  expect(calls).toEqual([]);
});

test("phát hành mới: tạo release rồi ghi kho", async () => {
  handler = (args) => (args[1] === "view" ? notFound() : ok());
  const r = await runRelease(base);
  expect(r.outcome).toBe("published");
  expect(r.release).toMatchObject({
    version: "0.9.1",
    fileName: LAD8_ZIP,
    gameBuild: "17233673",
    date: "2026-11-27",
    sha256: lad8Sha,
    url: "https://github.com/chu/kho/releases/download/lad8-v0.9.1/LAD8-VietHoa-v0.9.1.zip",
  });
  expect(r.release!.sizeBytes).toBeGreaterThan(0);
  expect(readStore(repoRoot, "lad8")).toHaveLength(1);
  expect(calls.every((c) => c.cmd === "gh")).toBe(true);
  const create = calls.find((c) => c.args[1] === "create")!;
  expect(create.args[create.args.indexOf("--title") + 1]).toBe("Like a Dragon: Infinite Wealth – Việt hóa v0.9.1");
  expect(logs.join("\n")).toMatch(/git add[\s\S]*git commit[\s\S]*git push/);
  expect(calls.some((c) => c.cmd === "git")).toBe(false);
});

test("chạy lại sau khi hỏng giữa chừng: không tải lại", async () => {
  handler = () => viewWith(lad8Sha);
  const r = await runRelease(base);
  expect(r.outcome).toBe("resumed");
  expect(calls.some((c) => c.args.includes("create"))).toBe(false);
  expect(readStore(repoRoot, "lad8")).toHaveLength(1);
});

test("tag đã có nhưng file khác: dừng, không ghi kho", async () => {
  handler = () => viewWith(wrongSha);
  await expect(runRelease(base)).rejects.toThrow(/đã tồn tại/);
  expect(readStore(repoRoot, "lad8")).toEqual([]);
});

test("tag đã có nhưng không có file đó: dừng, không ghi kho", async () => {
  handler = () => ok(JSON.stringify({ assets: [] }));
  await expect(runRelease(base)).rejects.toThrow(/đã tồn tại/);
  expect(readStore(repoRoot, "lad8")).toEqual([]);
  expect(calls.some((c) => c.args.includes("create"))).toBe(false);
});

test("file đã tải nhưng thiếu digest: dừng, không ghi kho", async () => {
  handler = () => viewWith(undefined);
  await expect(runRelease(base)).rejects.toThrow(/digest/);
  expect(readStore(repoRoot, "lad8")).toEqual([]);
  expect(calls.some((c) => c.args.includes("create"))).toBe(false);
});

test("gh xem release lỗi khác (không phải not found): dừng, không tạo", async () => {
  handler = () => ({ code: 1, stdout: "", stderr: "HTTP 401: Bad credentials" });
  await expect(runRelease(base)).rejects.toThrow(/401/);
  expect(calls.some((c) => c.args.includes("create"))).toBe(false);
  expect(readStore(repoRoot, "lad8")).toEqual([]);
});

test("chưa cấu hình repo", async () => {
  await expect(runRelease({ ...base, repo: null })).rejects.toThrow(/vault\.config\.ts/);
  expect(calls).toEqual([]);
});

test("tải lên thất bại thì không ghi kho", async () => {
  handler = (args) => (args[1] === "view" ? notFound() : { code: 1, stdout: "", stderr: "boom" });
  await expect(runRelease(base)).rejects.toThrow(/boom/);
  expect(readStore(repoRoot, "lad8")).toEqual([]);
});

test("phiên bản sai định dạng bị từ chối trước khi làm gì", async () => {
  await expect(runRelease({ ...base, version: "../x" })).rejects.toThrow(/phiên bản/i);
  await expect(runRelease({ ...base, version: "" })).rejects.toThrow(/phiên bản/i);
  expect(calls).toEqual([]);
});

describe("parseArgs", () => {
  test("hợp lệ", () => {
    expect(parseArgs(["lad8", "0.9.1"])).toEqual({ id: "lad8", version: "0.9.1", notes: null, gameBuild: null, confirm: false });
    expect(parseArgs(["lad8", "0.9.1", "--notes", "n.txt", "--game-build", "42", "--confirm"])).toEqual({
      id: "lad8", version: "0.9.1", notes: "n.txt", gameBuild: "42", confirm: true,
    });
  });
  test.each([
    [[]],
    [["lad8"]],
    [["lad8", "0.9.1", "extra"]],
    [["lad8", "0.9.1", "--allow-internal"]],
    [["lad8", "0.9.1", "--notes"]],
    [["lad8", "0.9.1", "--game-build"]],
    [["lad8", "0.9.1", "--notes", "--confirm"]],
    [["lad8", "0.9.1", "--confirm=yes"]],
    [["lad8", "v0.9.1"]],
    [["lad8", "0.9.x"]],
    [["lad8", "0.9.1", "--notes", "a", "--notes", "b"]],
  ])("từ chối %j", (argv) => {
    expect(parseArgs(argv as string[])).toHaveProperty("error");
  });
});
