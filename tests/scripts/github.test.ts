import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { assetUrl, createRelease, getExistingAssetSha, releaseTag, type Runner } from "../../scripts/lib/github";

const SHA = "ab".repeat(32);
const ok = (stdout: string) => ({ code: 0, stdout, stderr: "" });

function scripted(result: { code: number; stdout: string; stderr: string }) {
  const calls: Array<{ cmd: string; args: string[] }> = [];
  const run: Runner = async (cmd, args) => {
    calls.push({ cmd, args });
    return result;
  };
  return { run, calls };
}

test("tag và url", () => {
  expect(releaseTag("lad8-infinite-wealth", "0.9.1")).toBe("lad8-infinite-wealth-v0.9.1");
  expect(assetUrl("a/b", "g-v1", "G v1.zip")).toBe("https://github.com/a/b/releases/download/g-v1/G%20v1.zip");
});

describe("getExistingAssetSha", () => {
  test("gọi đúng gh release view", async () => {
    const { run, calls } = scripted(ok(JSON.stringify({ assets: [] })));
    await getExistingAssetSha(run, "chu/kho", "g-v1", "G.zip");
    expect(calls).toEqual([{ cmd: "gh", args: ["release", "view", "g-v1", "--repo", "chu/kho", "--json", "assets"] }]);
  });
  test("chưa có release: no-release", async () => {
    const { run } = scripted({ code: 1, stdout: "", stderr: "release not found" });
    expect(await getExistingAssetSha(run, "chu/kho", "g-v1", "G.zip")).toBe("no-release");
  });
  test("lỗi khác (mạng, quyền) thì ném lỗi, không coi là no-release", async () => {
    const { run } = scripted({ code: 1, stdout: "", stderr: "HTTP 401: Bad credentials" });
    await expect(getExistingAssetSha(run, "chu/kho", "g-v1", "G.zip")).rejects.toThrow(/401/);
  });
  test("có release nhưng không có file: null", async () => {
    const { run } = scripted(ok(JSON.stringify({ assets: [{ name: "khac.zip", digest: `sha256:${SHA}` }] })));
    expect(await getExistingAssetSha(run, "chu/kho", "g-v1", "G.zip")).toBeNull();
  });
  test("trả sha256 chữ thường, bỏ tiền tố", async () => {
    const { run } = scripted(ok(JSON.stringify({ assets: [{ name: "G.zip", digest: `sha256:${SHA.toUpperCase()}` }] })));
    expect(await getExistingAssetSha(run, "chu/kho", "g-v1", "G.zip")).toBe(SHA);
  });
  test("file có nhưng thiếu digest: ném lỗi", async () => {
    const { run } = scripted(ok(JSON.stringify({ assets: [{ name: "G.zip" }] })));
    await expect(getExistingAssetSha(run, "chu/kho", "g-v1", "G.zip")).rejects.toThrow(/digest/);
  });
  test("digest không phải sha256: ném lỗi", async () => {
    const { run } = scripted(ok(JSON.stringify({ assets: [{ name: "G.zip", digest: "md5:abc" }] })));
    await expect(getExistingAssetSha(run, "chu/kho", "g-v1", "G.zip")).rejects.toThrow(/digest/);
  });
  test("đầu ra không phải JSON: ném lỗi", async () => {
    const { run } = scripted(ok("không phải json"));
    await expect(getExistingAssetSha(run, "chu/kho", "g-v1", "G.zip")).rejects.toThrow();
  });
});

describe("createRelease", () => {
  const input = { repo: "chu/kho", tag: "g-v1", title: "Game – Việt hóa v1", notes: "Ghi chú\nHai dòng", zipPath: "/tmp/G v1.zip" };

  test("gọi gh release create với file ghi chú tạm, rồi xóa file đó", async () => {
    let notesPath = "";
    let notesText = "";
    const calls: string[][] = [];
    const run: Runner = async (_cmd, args) => {
      calls.push(args);
      notesPath = args[args.indexOf("--notes-file") + 1];
      notesText = readFileSync(notesPath, "utf8");
      return ok("");
    };
    await createRelease(run, input);
    expect(calls[0].slice(0, 7)).toEqual(["release", "create", "g-v1", "/tmp/G v1.zip", "--repo", "chu/kho", "--title"]);
    expect(calls[0][7]).toBe("Game – Việt hóa v1");
    expect(notesText).toBe("Ghi chú\nHai dòng");
    const { existsSync } = await import("node:fs");
    expect(existsSync(notesPath)).toBe(false);
  });
  test("thoát khác 0: ném lỗi kèm stderr", async () => {
    const { run } = scripted({ code: 1, stdout: "", stderr: "HTTP 422: boom" });
    await expect(createRelease(run, input)).rejects.toThrow(/boom/);
  });
  test("đường dẫn có # sẽ bị gh hiểu là nhãn: từ chối", async () => {
    const { run, calls } = scripted(ok(""));
    await expect(createRelease(run, { ...input, zipPath: "/tmp/G#1.zip" })).rejects.toThrow(/#/);
    expect(calls).toEqual([]);
  });
});
