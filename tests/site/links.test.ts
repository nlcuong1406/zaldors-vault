import { expect, test } from "vitest";
import { issueUrl } from "../../src/lib/links";

test("chưa nối repo thì không có liên kết báo lỗi", () => {
  expect(issueUrl(null, { title: "X" }, "1.0")).toBeNull();
});

test("liên kết báo lỗi điền sẵn game và phiên bản", () => {
  const u = new URL(issueUrl("chu/kho", { title: "Zelda: OoT 3D" }, "0.9.1")!);
  expect(u.origin + u.pathname).toBe("https://github.com/chu/kho/issues/new");
  expect(u.searchParams.get("title")).toBe("[Zelda: OoT 3D] Lỗi dịch: ");
  expect(u.searchParams.get("body")).toContain("Phiên bản patch: 0.9.1");
  expect(u.searchParams.get("body")).toBe("Game: Zelda: OoT 3D\nPhiên bản patch: 0.9.1");
  expect(new URL(issueUrl("chu/kho", { title: "X" }, null)!).searchParams.get("body")).toContain("chưa phát hành");
});
