import { describe, expect, test } from "vitest";
import { checkPackage } from "../../scripts/lib/guard";
import type { ZipEntry } from "../../scripts/lib/types";

const entries: ZipEntry[] = [
  { path: "G-v1/data/a.bin", sizeBytes: 3, sha256: "aa".repeat(32) },
  { path: "G-v1/data/b.bin", sizeBytes: 3, sha256: "bb".repeat(32) },
];
const clean = {
  zipFileName: "LAD8-VietHoa-v0.9.1.zip",
  entries,
  inputHashes: ["ff".repeat(32)],
  rootTexts: { "GHI-CONG.txt": "Thực hiện: Vergilize" } as Record<string, string>,
};

describe("checkPackage", () => {
  test("gói mod sạch thì không bị chặn", () => {
    expect(checkPackage(clean)).toEqual([]);
  });
  test("chặn tên internal", () => {
    expect(checkPackage({ ...clean, zipFileName: "SB-VH-v0.3-Internal.zip" }).map((b) => b.rule)).toEqual(["internal-name"]);
  });
  test("chặn file trùng mã băm đầu vào, nêu đường dẫn", () => {
    const b = checkPackage({ ...clean, inputHashes: [entries[0].sha256] });
    expect(b).toEqual([{ rule: "original-file", detail: entries[0].path }]);
  });
  test("so mã băm không phân biệt hoa thường", () => {
    const b = checkPackage({ ...clean, inputHashes: [entries[0].sha256.toUpperCase()] });
    expect(b.map((x) => x.rule)).toEqual(["original-file"]);
    const c = checkPackage({ ...clean, entries: [{ ...entries[0], sha256: "AA".repeat(32) }], inputHashes: ["aa".repeat(32)] });
    expect(c.map((x) => x.rule)).toEqual(["original-file"]);
  });
  test("mỗi mục trùng một khối original-file", () => {
    const b = checkPackage({ ...clean, inputHashes: [entries[0].sha256, entries[1].sha256] });
    expect(b).toEqual([
      { rule: "original-file", detail: entries[0].path },
      { rule: "original-file", detail: entries[1].path },
    ]);
  });
  test("chặn ghi chú cấm phân phối, có dấu hay không dấu", () => {
    for (const t of ["(NOI BO, KHONG PHAN PHOI)", "Bản nội bộ", "KHÔNG PHÂN PHỐI"]) {
      expect(checkPackage({ ...clean, rootTexts: { "README.txt": t } })[0].rule).toBe("no-distribute-notice");
    }
  });
  test("ghi chú nêu tên file", () => {
    expect(checkPackage({ ...clean, rootTexts: { "README.txt": "nội bộ" } })).toEqual([
      { rule: "no-distribute-notice", detail: "README.txt" },
    ]);
  });
  test("bắt ghi chú bị ngắt dòng hoặc nhiều khoảng trắng", () => {
    for (const t of ["NOI\r\nBO", "nội  bộ", "nội\tbộ", "nội bộ", "KHÔNG\n\n PHÂN \r\n PHỐI", "nội  \r\nbộ"]) {
      expect(checkPackage({ ...clean, rootTexts: { "README.txt": t } }).map((b) => b.rule)).toEqual(["no-distribute-notice"]);
    }
  });
  test("văn bản bình thường không bị chặn nhầm", () => {
    expect(checkPackage({ ...clean, rootTexts: { "README.txt": "Bản vá công khai. Phân phối tự do." } })).toEqual([]);
  });
  test("báo đủ mọi vi phạm, đúng thứ tự", () => {
    const b = checkPackage({ zipFileName: "x-internal.zip", entries, inputHashes: [entries[0].sha256], rootTexts: { "README.txt": "noi bo" } });
    expect(b).toHaveLength(3);
    expect(b.map((x) => x.rule)).toEqual(["internal-name", "original-file", "no-distribute-notice"]);
  });
});
