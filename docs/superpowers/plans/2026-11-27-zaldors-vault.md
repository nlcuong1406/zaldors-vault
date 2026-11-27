# Zaldor's Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng trang tĩnh Zaldor's Vault chạy được trên máy, cùng hai lệnh `sync` và `release` đọc thư mục dự án VH.

**Architecture:** Astro xuất trang tĩnh. Nội dung mỗi game là một file Markdown viết tay; danh sách bản phát hành là file JSON do lệnh `release` sinh. Logic của hai lệnh nằm trong các module nhỏ ở `scripts/lib/`, kiểm thử bằng thư mục VH giả; phần gọi GitHub đi qua một hàm chạy lệnh được tiêm vào để kiểm thử không chạm mạng.

**Tech Stack:** Node 24, Astro 7 (TypeScript strict), Vitest 5, `tsx` để chạy script, `yauzl` đọc zip theo luồng, `yazl` tạo zip trong kiểm thử, `@fontsource` cho phông chữ, `gh` CLI (chỉ dùng ở bước tải lên, chưa cài).

**Spec:** `docs/superpowers/specs/2026-11-27-zaldors-vault-design.md`. Người thực hiện đọc cả hai tài liệu.

## Global Constraints

- `D:\Prjs\VH` là **chỉ đọc**. Không script, kiểm thử hay bước nào được ghi vào đó.
- Kiểm thử tự động không đọc `D:\Prjs\VH` thật và không gọi mạng. Dùng thư mục tạm.
- Kế hoạch này **không** cài `gh`, không tạo repo trên GitHub, không push, không tải file nào lên. Lệnh `release` thật không được chạy với `--confirm`.
- Trong repo, `src/data/releases/<id>.json` của cả 5 game là mảng rỗng `[]`.
- `tests/fixtures/` chỉ được đọc khi `VAULT_FIXTURES=1`.
- Giao diện tiếng Việt, câu ngắn, không viết hoa toàn bộ, chỉ tông tối.
- Màu: nền `#16130E`, nền khối `#2A2418`, chữ chính `#EDE4D0`, chữ phụ `#A99B7C`, nhấn `#D9B25F`, viền `#4A3F28`.
- Phông chữ nằm trong bản build (gói `@fontsource`), không tải từ máy chủ ngoài, đủ dấu tiếng Việt. Đề xuất: EB Garamond cho tiêu đề, Be Vietnam Pro cho thân bài.
- Chân trang mọi trang, đúng nguyên văn: "Zaldor's Vault chỉ phát hành bản vá ngôn ngữ. Bạn cần có bản game gốc hợp lệ. Trang không liên kết với nhà phát hành nào."
- Credit mặc định: "Zaldor (Vergilize)".
- File trong repo dùng xuống dòng LF (`.gitattributes` đã đặt).
- Astro 7 mới hơn nhiều tài liệu cũ. Trước khi viết content collection hay cấu hình, đọc tài liệu Astro hiện hành thay vì dựa vào trí nhớ.
- Commit sau mỗi task. Dòng cuối thông điệp commit: `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.

## Review Focus

Những đầu vào spec không nhắc tới nhưng dễ gặp nhất. Mỗi dòng có kiểm thử ở task ghi trong ngoặc.

1. File văn bản của VH có BOM và xuống dòng CRLF (`GHI-CONG.txt` thật có BOM). Đọc `.sha256`, `PHAT-HANH.txt`, `manifest.json`, README đều phải bỏ BOM và chịu được CRLF. (Task 3, 4, 5)
2. Dấu hiệu cấm viết có dấu hoặc khác hoa thường: "KHÔNG PHÂN PHỐI", "Nội bộ". So khớp sau khi bỏ dấu và đổi về chữ thường. (Task 4)
3. Phiên bản là tiền tố của phiên bản khác: tìm `0.9` không được khớp `v0.9.0` hay `v0.9.1`; tìm `0.9.1` không khớp `v0.9.10`. (Task 3)
4. Gói zip bọc mọi thứ trong một thư mục gốc duy nhất (`LAD8-VietHoa-v0.9.1/README.txt`) thay vì để file ở gốc. "Gốc gói" phải hiểu cả hai kiểu. (Task 4)
5. Game có file `.md` trên trang nhưng không còn thư mục bên VH, hoặc `project.json` thiếu `inputs`/thiếu `sha256`: `sync` báo rõ và làm tiếp các game khác, không sập. (Task 3, 6)

## File Structure

```
vault.config.ts                 cấu hình trang: repo GitHub, giscus, donate (đều có thể null)
astro.config.mjs
src/content.config.ts           schema collection "games"
src/content/games/<id>.md       nội dung viết tay (5 file, do sync tạo)
src/data/releases/<id>.json     do release sinh (5 file "[]")
src/lib/games.ts                ghép game + releases, kiểm tra lúc build
src/lib/format.ts               định dạng dung lượng, ngày
src/styles/tokens.css           màu, phông, khoảng cách
src/layouts/Base.astro          khung trang, đầu trang, chân trang
src/components/                 GameCard, ProgressBar, DownloadBlock, Changelog,
                                ReportBug, Comments, Donate
src/pages/                      index, game/[id], huong-dan, gioi-thieu, 404
scripts/lib/text.ts             bỏ BOM, bỏ dấu
scripts/lib/hash.ts             SHA-256 file, đọc file .sha256
scripts/lib/vh.ts               đọc project.json, tìm zip trong release/
scripts/lib/zip.ts              liệt kê và băm file trong zip, đọc file văn bản ở gốc
scripts/lib/guard.ts            ba quy tắc chặn cứng
scripts/lib/release-info.ts     lấy notes, date, gameBuild
scripts/lib/releases-store.ts   đọc/ghi src/data/releases/<id>.json
scripts/lib/github.ts           gọi gh qua hàm chạy lệnh được tiêm vào
scripts/sync.ts                 lệnh sync
scripts/release.ts              lệnh release
tests/scripts/*.test.ts         kiểm thử script
tests/site/*.test.ts            kiểm thử src/lib
tests/helpers/fake-vh.ts        dựng thư mục VH giả và zip mẫu trong thư mục tạm
tests/fixtures/releases/        dữ liệu mẫu cho VAULT_FIXTURES=1
```

Kiểu dùng chung, định nghĩa ở `scripts/lib/types.ts` và được `src/lib/games.ts` nhập lại:

```ts
export interface Release {
  version: string;      // "0.9.1", không có chữ v
  date: string;         // "YYYY-MM-DD"
  fileName: string;
  sizeBytes: number;
  sha256: string;       // 64 ký tự hex chữ thường
  url: string;
  gameBuild: string;
  notes: string;        // Markdown hoặc văn bản thường
}
export interface VhProject {
  id: string; title: string; platform: string; edition: string;
  inputHashes: string[];   // sha256 chữ thường lấy từ inputs[], bỏ mục thiếu sha256
  releaseDir: string;      // đường dẫn tuyệt đối
}
export interface ZipEntry { path: string; sizeBytes: number; sha256: string; } // path dùng "/"
```

---

### Task 1: Khung dự án và giao diện nền

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`, `vault.config.ts`, `src/styles/tokens.css`, `src/layouts/Base.astro`, `src/pages/index.astro` (tạm), `tests/site/smoke.test.ts`

**Interfaces:**
- Produces: `vault.config.ts` xuất mặc định

```ts
export default {
  siteName: "Zaldor's Vault",
  credit: "Zaldor (Vergilize)",
  repo: null as string | null,                      // "chu-so-huu/ten-repo"
  giscus: null as { repoId: string; category: string; categoryId: string } | null,
  donate: null as { label: string; url: string } | null,
};
```

- Produces: `Base.astro` nhận props `{ title: string; description?: string }`, có `<slot />`.
- Produces: script npm `dev`, `build`, `check` (`astro check`), `test` (`vitest run`), `sync`, `release` (hai lệnh sau trỏ tới `tsx scripts/sync.ts`, `tsx scripts/release.ts`).

- [ ] **Step 1:** Khởi tạo Astro bản tối giản, TypeScript strict, vào thư mục hiện có (giữ nguyên `docs/` và `.gitattributes`). Cài `vitest`, `tsx`, `yauzl`, `yazl`, kiểu tương ứng, và hai gói `@fontsource`.
- [ ] **Step 2:** `.gitignore` gồm `node_modules/`, `dist/`, `.astro/`, `.env`. `.env.example` có một dòng `VH_ROOT=D:\Prjs\VH`.
- [ ] **Step 3:** Viết `tokens.css` với sáu màu ở Global Constraints dưới dạng biến CSS, hai họ phông, và `body` có nền, màu chữ rõ ràng.
- [ ] **Step 4:** Viết `Base.astro`: đầu trang có tên trang (dẫn về `/`) và ba liên kết "Kho game" (`/`), "Hướng dẫn" (`/huong-dan/`), "Giới thiệu" (`/gioi-thieu/`); chân trang có câu miễn trừ nguyên văn. `lang="vi"`.
- [ ] **Step 5:** Viết kiểm thử khói

```ts
test("cấu hình mặc định chưa nối dịch vụ ngoài", () => {
  expect(config.siteName).toBe("Zaldor's Vault");
  expect(config.credit).toBe("Zaldor (Vergilize)");
  expect(config.repo).toBeNull();
  expect(config.giscus).toBeNull();
  expect(config.donate).toBeNull();
});
```

- [ ] **Step 6:** Chạy `npm test`, `npm run check`, `npm run build`. Mong đợi: cả ba không lỗi, `dist/index.html` chứa câu miễn trừ.
- [ ] **Step 7:** Commit `chore: scaffold Astro site with base layout and tokens`.

---

### Task 2: Schema nội dung và lớp ghép dữ liệu

**Files:**
- Create: `scripts/lib/types.ts`, `src/content.config.ts`, `src/lib/games.ts`, `src/lib/format.ts`, `tests/site/games.test.ts`, `tests/site/format.test.ts`, `tests/fixtures/releases/lad8-infinite-wealth.json`

**Interfaces:**
- Consumes: kiểu `Release` (định nghĩa trong task này ở `scripts/lib/types.ts`).
- Produces: collection `games`, phần đầu file:

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | string | |
| `title`, `platform`, `edition` | string | |
| `status` | `"dang-dich" \| "hoan-thanh" \| "tam-dung"` | |
| `progress` | số nguyên 0..100 | ngoài khoảng thì build lỗi |
| `tagline` | string | |
| `cover` | ảnh, tùy chọn | |
| `screenshots` | mảng ảnh, mặc định `[]` | |
| `credits` | mảng `{ name: string; role: string }`, mặc định `[]` | |

- Produces, trong `src/lib/games.ts`:

```ts
export function loadReleases(id: string, opts?: { fixtures?: boolean; root?: string }): Release[];
//  đọc src/data/releases/<id>.json; khi fixtures=true và có tests/fixtures/releases/<id>.json thì đọc file đó thay.
//  Thiếu file → []. Trả về đã sắp theo phiên bản giảm dần (so từng phần số).
export function validateGame(g: { id: string; status: string }, releases: Release[]): void;
//  ném Error có chứa id game nếu status === "hoan-thanh" và releases rỗng.
export const STATUS_LABEL: Record<string, string>;
//  { "dang-dich": "Đang dịch", "hoan-thanh": "Hoàn thành", "tam-dung": "Tạm dừng" }
export async function getGames(): Promise<Array<{ entry: CollectionEntry<"games">; releases: Release[]; latest: Release | null }>>;
//  dùng VAULT_FIXTURES=1 từ biến môi trường; gọi validateGame cho từng game; sắp: có bản tải trước, rồi theo progress giảm dần.
```

- Produces, trong `src/lib/format.ts`: `formatBytes(n: number): string` và `formatDate(iso: string): string`.

- [ ] **Step 1:** Viết kiểm thử

```ts
test("thiếu file releases thì trả mảng rỗng", () => {
  expect(loadReleases("khong-co", { root: tmp })).toEqual([]);
});
test("sắp phiên bản theo số, không theo chữ", () => {
  // file chứa 0.9.0, 0.10.0, 0.9.1
  expect(loadReleases("g", { root: tmp }).map(r => r.version)).toEqual(["0.10.0", "0.9.1", "0.9.0"]);
});
test("fixtures chỉ được đọc khi bật", () => {
  expect(loadReleases("g", { root: tmp, fixtures: false })).toEqual([]);
  expect(loadReleases("g", { root: tmp, fixtures: true })).toHaveLength(1);
});
test("hoàn thành mà không có bản tải thì lỗi, nêu tên game", () => {
  expect(() => validateGame({ id: "zelda-oot3d", status: "hoan-thanh" }, [])).toThrow(/zelda-oot3d/);
  expect(() => validateGame({ id: "x", status: "dang-dich" }, [])).not.toThrow();
});
test("định dạng", () => {
  expect(formatBytes(14_680_064)).toBe("14 MB");
  expect(formatBytes(1_610_612_736)).toBe("1,5 GB");
  expect(formatBytes(512_000)).toBe("500 KB");
  expect(formatDate("2026-11-27")).toBe("27/11/2026");
});
```

- [ ] **Step 2:** Chạy `npm test`. Mong đợi: FAIL vì chưa có module.
- [ ] **Step 3:** Viết `types.ts`, `content.config.ts`, `games.ts`, `format.ts`. `formatBytes` dùng bội 1024, dấu phẩy thập phân, MB và KB làm tròn số nguyên, GB một chữ số thập phân.
- [ ] **Step 4:** Tạo `tests/fixtures/releases/lad8-infinite-wealth.json` với hai bản mẫu (0.9.1 và 0.9.0), `url` là `https://example.invalid/...`, `gameBuild` `"17233673"`.
- [ ] **Step 5:** Chạy `npm test` và `npm run check`. Mong đợi: PASS.
- [ ] **Step 6:** Commit `feat: add games content schema and release data layer`.

---

### Task 3: Đọc dự án VH và mã băm

**Files:**
- Create: `scripts/lib/text.ts`, `scripts/lib/hash.ts`, `scripts/lib/vh.ts`, `tests/helpers/fake-vh.ts`, `tests/scripts/hash.test.ts`, `tests/scripts/vh.test.ts`

**Interfaces:**
- Produces:

```ts
// text.ts
export function stripBom(s: string): string;
export function foldVietnamese(s: string): string;   // bỏ dấu (kể cả đ→d), về chữ thường
// hash.ts
export function sha256File(path: string): Promise<string>;          // đọc theo luồng
export function parseSha256File(text: string): string | null;       // lấy 64 hex đầu tiên của dòng đầu, chữ thường; chịu BOM, CRLF
// vh.ts
export function listProjectIds(vhRoot: string): string[];           // thư mục con của projects/ có project.json, sắp a-z
export function loadProject(vhRoot: string, id: string): VhProject; // ném Error nêu id nếu thiếu project.json hoặc JSON hỏng
export function findReleaseZip(project: VhProject, version: string): string;
// fake-vh.ts
export function makeFakeVh(spec: Record<string, { projectJson?: object; zips?: Record<string, Record<string, string | Buffer>>; extraFiles?: Record<string, string> }>): Promise<string>;
//  dựng thư mục tạm có projects/<id>/project.json và release/<tên zip>, trả về vhRoot.
```

- `findReleaseZip`: chỉ xét file `.zip` nằm trực tiếp trong `releaseDir`. Tên file khớp khi chứa `v<version>` và ký tự ngay sau đó không phải chữ số và không phải dấu chấm theo sau bởi chữ số. Không khớp file nào → Error chứa "không tìm thấy". Khớp hơn một → Error chứa "nhiều hơn một" và liệt kê tên.

- [ ] **Step 1:** Viết `fake-vh.ts` (dùng `yazl`, thư mục tạm của hệ điều hành).
- [ ] **Step 2:** Viết kiểm thử

```ts
test("đọc file .sha256 có BOM và CRLF", () => {
  expect(parseSha256File("\uFEFFACE2671339613EF91C5946F3CBC3F53A28A3B3E7C9E78892D700EA66A671B9DF  a.zip\r\n"))
    .toBe("ace2671339613ef91c5946f3cbc3f53a28a3b3e7c9e78892d700ea66a671b9df");
  expect(parseSha256File("không phải mã băm")).toBeNull();
});
test("bỏ dấu tiếng Việt", () => {
  expect(foldVietnamese("KHÔNG PHÂN PHỐI")).toBe("khong phan phoi");
  expect(foldVietnamese("Nội bộ, Đừng")).toBe("noi bo, dung");
});
test("sha256File khớp giá trị đã biết", async () => {
  // file chứa "abc"
  expect(await sha256File(p)).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
test("loadProject lấy trường và mã băm đầu vào", () => {
  // inputs: [{path, sha256:"AB..."}, {path}]  → bỏ mục thiếu sha256, về chữ thường
  expect(p.inputHashes).toEqual(["ab".repeat(32)]);
  expect(p.title).toBe("Game Thử");
});
test("project.json không có inputs vẫn đọc được", () => {
  expect(loadProject(root, "khong-inputs").inputHashes).toEqual([]);
});
test("loadProject báo id khi thiếu file", () => {
  expect(() => loadProject(root, "ma")).toThrow(/ma/);
});
test("tìm zip theo phiên bản, không khớp tiền tố", () => {
  // release/ có G-v0.9.0.zip, G-v0.9.1.zip, G-v0.9.10.zip
  expect(basename(findReleaseZip(p, "0.9.1"))).toBe("G-v0.9.1.zip");
  expect(() => findReleaseZip(p, "0.9")).toThrow(/không tìm thấy/);
});
test("hai zip cùng phiên bản thì dừng", () => {
  // G-v1.0.zip và G-v1.0-internal.zip
  expect(() => findReleaseZip(p2, "1.0")).toThrow(/nhiều hơn một/);
});
```

- [ ] **Step 3:** Chạy `npm test`. Mong đợi: FAIL.
- [ ] **Step 4:** Viết ba module.
- [ ] **Step 5:** Chạy `npm test`. Mong đợi: PASS.
- [ ] **Step 6:** Commit `feat: read VH project profiles and release hashes`.

---

### Task 4: Soi gói zip và ba quy tắc chặn cứng

**Files:**
- Create: `scripts/lib/zip.ts`, `scripts/lib/guard.ts`, `tests/scripts/zip.test.ts`, `tests/scripts/guard.test.ts`

**Interfaces:**
- Consumes: `foldVietnamese`, `stripBom`, `ZipEntry`, `makeFakeVh`.
- Produces:

```ts
// zip.ts
export function listEntries(zipPath: string): Promise<ZipEntry[]>;
//  bỏ mục thư mục; path đổi "\" thành "/"; băm từng file theo luồng, không nạp cả zip vào bộ nhớ.
export function packageRoot(entries: ZipEntry[]): string;
//  "" nếu có file ở gốc; "Ten/" nếu mọi file nằm trong đúng một thư mục gốc.
export function readRootTexts(zipPath: string, entries: ZipEntry[]): Promise<Record<string, string>>;
//  đọc các file .txt, .md, .json nằm trực tiếp ở packageRoot và nhỏ hơn 1 MB; khóa là tên file không kèm thư mục; đã bỏ BOM.
// guard.ts
export interface Block { rule: "internal-name" | "original-file" | "no-distribute-notice"; detail: string; }
export function checkPackage(input: { zipFileName: string; entries: ZipEntry[]; inputHashes: string[]; rootTexts: Record<string, string> }): Block[];
```

- Quy tắc: `internal-name` khi tên zip chứa `internal` (không phân biệt hoa thường). `original-file` khi một mục có `sha256` nằm trong `inputHashes`; `detail` là đường dẫn mục. `no-distribute-notice` khi một văn bản gốc, sau `foldVietnamese`, chứa `khong phan phoi` hoặc `noi bo`; `detail` là tên file. Trả về mọi vi phạm, không dừng ở cái đầu.

- [ ] **Step 1:** Viết kiểm thử

```ts
test("liệt kê mục, bỏ thư mục, đường dẫn dùng /", async () => {
  // zip có "data/a.bin" ("abc") và "README.txt"
  const e = await listEntries(zip);
  expect(e.map(x => x.path).sort()).toEqual(["README.txt", "data/a.bin"]);
  expect(e.find(x => x.path === "data/a.bin")!.sha256).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
test("gốc gói: phẳng và bọc một thư mục", () => {
  expect(packageRoot([{ path: "README.txt" }, { path: "data/a" }] as any)).toBe("");
  expect(packageRoot([{ path: "G-v1/README.txt" }, { path: "G-v1/data/a" }] as any)).toBe("G-v1/");
});
test("đọc văn bản gốc trong gói bọc thư mục, bỏ BOM", async () => {
  // "G-v1/PHAT-HANH.txt" = "\uFEFFSửa lỗi\r\n", "G-v1/data/sau.txt" không được đọc
  expect(await readRootTexts(zip, entries)).toEqual({ "PHAT-HANH.txt": "Sửa lỗi\r\n" });
});
test("gói mod sạch thì không bị chặn", () => {
  expect(checkPackage({ zipFileName: "LAD8-VietHoa-v0.9.1.zip", entries, inputHashes: ["ff".repeat(32)], rootTexts: { "GHI-CONG.txt": "Thực hiện: Vergilize" } })).toEqual([]);
});
test("chặn tên internal", () => {
  expect(checkPackage({ ...clean, zipFileName: "SB-VH-v0.3-Internal.zip" }).map(b => b.rule)).toEqual(["internal-name"]);
});
test("chặn file trùng mã băm đầu vào, nêu đường dẫn", () => {
  const b = checkPackage({ ...clean, inputHashes: [entries[0].sha256] });
  expect(b).toEqual([{ rule: "original-file", detail: entries[0].path }]);
});
test("chặn ghi chú cấm phân phối, có dấu hay không dấu", () => {
  for (const t of ["(NOI BO, KHONG PHAN PHOI)", "Bản nội bộ", "KHÔNG PHÂN PHỐI"]) {
    expect(checkPackage({ ...clean, rootTexts: { "README.txt": t } })[0].rule).toBe("no-distribute-notice");
  }
});
test("báo đủ mọi vi phạm", () => {
  expect(checkPackage({ zipFileName: "x-internal.zip", entries, inputHashes: [entries[0].sha256], rootTexts: { "README.txt": "noi bo" } })).toHaveLength(3);
});
```

- [ ] **Step 2:** Chạy `npm test`. Mong đợi: FAIL.
- [ ] **Step 3:** Viết `zip.ts` (dùng `yauzl`) và `guard.ts`.
- [ ] **Step 4:** Chạy `npm test`. Mong đợi: PASS.
- [ ] **Step 5:** Commit `feat: inspect packages and hard-block non-public ones`.

---

### Task 5: Thông tin bản phát hành và kho JSON

**Files:**
- Create: `scripts/lib/release-info.ts`, `scripts/lib/releases-store.ts`, `tests/scripts/release-info.test.ts`, `tests/scripts/releases-store.test.ts`

**Interfaces:**
- Consumes: `Release`, `stripBom`.
- Produces:

```ts
// release-info.ts
export function resolveReleaseInfo(input: {
  notesFileText: string | null;        // nội dung file --notes, null nếu không truyền
  gameBuildFlag: string | null;        // --game-build
  rootTexts: Record<string, string>;   // từ readRootTexts
  today: string;                       // "YYYY-MM-DD"
}): { notes: string; date: string; gameBuild: string };
// releases-store.ts
export function readStore(repoRoot: string, id: string): Release[];     // thiếu file → []
export function upsertRelease(repoRoot: string, id: string, r: Release): Release[];
//  thay mục cùng version nếu có, nếu không thì thêm; ghi JSON thụt 2 dấu cách, kết thúc bằng "\n", LF; trả về mảng mới.
```

- `resolveReleaseInfo`: `notes` lấy `notesFileText`, nếu null thì `rootTexts["PHAT-HANH.txt"]`, cả hai đều thiếu hoặc chỉ có khoảng trắng → Error chứa `--notes`. `notes` được bỏ BOM, đổi CRLF thành LF, cắt khoảng trắng đầu cuối. Nếu `rootTexts["manifest.json"]` đọc được: `date` lấy `manifest.date` khi đúng dạng `YYYY-MM-DD`, `gameBuild` lấy `manifest.game.build` khi là chuỗi không rỗng. `gameBuildFlag` nếu có thì thắng manifest. Không có `gameBuild` từ nguồn nào → Error chứa `--game-build`. `manifest.json` hỏng thì coi như không có. `date` mặc định là `today`.

- [ ] **Step 1:** Viết kiểm thử

```ts
const manifest = JSON.stringify({ version: "0.9.1", date: "2026-11-27", game: { build: "17233673" } });
test("lấy đủ từ gói LAD8", () => {
  expect(resolveReleaseInfo({ notesFileText: null, gameBuildFlag: null, today: "2027-01-01",
    rootTexts: { "PHAT-HANH.txt": "\uFEFFSửa 12 câu\r\nThêm font\r\n", "manifest.json": manifest } }))
    .toEqual({ notes: "Sửa 12 câu\nThêm font", date: "2026-11-27", gameBuild: "17233673" });
});
test("--notes và --game-build thắng nội dung gói", () => {
  const r = resolveReleaseInfo({ notesFileText: "Ghi chú tay", gameBuildFlag: "999", today: "2027-01-01",
    rootTexts: { "PHAT-HANH.txt": "cũ", "manifest.json": manifest } });
  expect(r.notes).toBe("Ghi chú tay"); expect(r.gameBuild).toBe("999");
});
test("không có ghi chú thì yêu cầu --notes", () => {
  expect(() => resolveReleaseInfo({ notesFileText: null, gameBuildFlag: "1", today: "2027-01-01", rootTexts: {} })).toThrow(/--notes/);
  expect(() => resolveReleaseInfo({ notesFileText: "  \n", gameBuildFlag: "1", today: "2027-01-01", rootTexts: {} })).toThrow(/--notes/);
});
test("không có manifest thì cần --game-build, ngày là hôm nay", () => {
  expect(() => resolveReleaseInfo({ notesFileText: "a", gameBuildFlag: null, today: "2027-01-01", rootTexts: {} })).toThrow(/--game-build/);
  expect(resolveReleaseInfo({ notesFileText: "a", gameBuildFlag: "1.5.0", today: "2027-01-01", rootTexts: { "manifest.json": "{hỏng" } }).date).toBe("2027-01-01");
});
test("kho: thêm rồi thay cùng phiên bản", () => {
  upsertRelease(root, "g", rel("0.9.0"));
  upsertRelease(root, "g", rel("0.9.1"));
  upsertRelease(root, "g", { ...rel("0.9.1"), notes: "mới" });
  const s = readStore(root, "g");
  expect(s).toHaveLength(2);
  expect(s.find(r => r.version === "0.9.1")!.notes).toBe("mới");
  const raw = readFileSync(join(root, "src/data/releases/g.json"), "utf8");
  expect(raw.endsWith("\n")).toBe(true); expect(raw.includes("\r")).toBe(false);
});
```

- [ ] **Step 2:** Chạy `npm test`. Mong đợi: FAIL.
- [ ] **Step 3:** Viết hai module.
- [ ] **Step 4:** Chạy `npm test`. Mong đợi: PASS.
- [ ] **Step 5:** Commit `feat: resolve release info and store releases as JSON`.

---

### Task 6: Lệnh `sync` và nội dung 5 game

**Files:**
- Create: `scripts/sync.ts`, `tests/scripts/sync.test.ts`, `src/content/games/*.md` (5 file), `src/data/releases/*.json` (5 file)

**Interfaces:**
- Consumes: `listProjectIds`, `loadProject`, `readStore`.
- Produces:

```ts
export function runSync(opts: { vhRoot: string; repoRoot: string }): {
  created: string[];                                   // id game vừa tạo file .md
  filled: Array<{ id: string; fields: string[] }>;     // trường trống vừa được điền
  unpublished: Array<{ id: string; zip: string }>;     // zip trong release/ chưa có trong kho
  orphans: string[];                                   // có .md trên trang nhưng không có dự án bên VH
  errors: Array<{ id: string; message: string }>;      // dự án đọc lỗi; các dự án khác vẫn chạy
};
```

- File `.md` mới: `id`, `title`, `platform`, `edition` lấy từ VH; `status: dang-dich`; `progress: 0`; `tagline: "Chưa có giới thiệu."`; `credits` một mục `{ name: "Zaldor (Vergilize)", role: "Dịch và kỹ thuật" }`; thân bài hai mục `## Giới thiệu` và `## Hướng dẫn cài đặt`, mỗi mục một dòng "Chưa có nội dung.". Đồng thời tạo `src/data/releases/<id>.json` chứa `[]` nếu chưa có.
- File `.md` đã có: chỉ điền `title`, `platform`, `edition` khi trường vắng mặt hoặc là chuỗi rỗng. Mọi thứ khác trong file, kể cả thân bài và thứ tự trường, giữ nguyên từng byte.
- `unpublished`: zip được coi là đã phát hành khi `fileName` của nó có trong kho.
- CLI: đọc `VH_ROOT` từ `.env` hoặc biến môi trường, mặc định `D:\Prjs\VH`; in kết quả bằng tiếng Việt; mã thoát 1 khi `errors` không rỗng.

- [ ] **Step 1:** Viết kiểm thử

```ts
test("tạo file cho game mới từ project.json", () => {
  const r = runSync({ vhRoot, repoRoot });
  expect(r.created).toEqual(["game-a", "game-b"]);
  // front(path): hàm trợ giúp trong file kiểm thử, phân tích phần đầu file YAML thành đối tượng
  expect(front(join(repoRoot, "src/content/games/game-a.md"))).toMatchObject({
    id: "game-a", title: "Game A", platform: "PC", edition: "USA", status: "dang-dich", progress: 0,
    credits: [{ name: "Zaldor (Vergilize)", role: "Dịch và kỹ thuật" }],
  });
  expect(readFileSync(join(repoRoot, "src/data/releases/game-a.json"), "utf8")).toBe("[]\n");
});
test("chạy lại không đổi byte nào", () => {
  runSync({ vhRoot, repoRoot });
  const before = readFileSync(mdPath);
  const r = runSync({ vhRoot, repoRoot });
  expect(r.created).toEqual([]); expect(r.filled).toEqual([]);
  expect(readFileSync(mdPath).equals(before)).toBe(true);
});
test("không ghi đè trường đã sửa tay, chỉ điền trường trống", () => {
  // sửa tay: title "Tên Tôi Đặt", edition ""
  const r = runSync({ vhRoot, repoRoot });
  expect(r.filled).toEqual([{ id: "game-a", fields: ["edition"] }]);
  expect(front(mdPath).title).toBe("Tên Tôi Đặt");
  expect(front(mdPath).edition).toBe("USA");
});
test("liệt kê zip chưa phát hành", () => {
  // release/ có G-v1.0.zip (đã có trong kho) và G-v1.1.zip
  expect(runSync({ vhRoot, repoRoot }).unpublished).toEqual([{ id: "game-a", zip: "G-v1.1.zip" }]);
});
test("game mồ côi và dự án hỏng không làm sập", () => {
  // thêm src/content/games/cu.md; game-b có project.json hỏng
  const r = runSync({ vhRoot, repoRoot });
  expect(r.orphans).toEqual(["cu"]);
  expect(r.errors.map(e => e.id)).toEqual(["game-b"]);
  expect(r.created).toContain("game-a");
});
test("không ghi gì vào VH", () => {
  const snap = snapshotTree(vhRoot); runSync({ vhRoot, repoRoot });
  expect(snapshotTree(vhRoot)).toEqual(snap);
});
```

- [ ] **Step 2:** Chạy `npm test`. Mong đợi: FAIL.
- [ ] **Step 3:** Viết `scripts/sync.ts`. Điền trường trống bằng cách sửa đúng dòng trong phần đầu file, không phân tích rồi ghi lại cả khối YAML.
- [ ] **Step 4:** Chạy `npm test`. Mong đợi: PASS.
- [ ] **Step 5:** Chạy `npm run sync` với VH thật. Mong đợi: tạo 5 file `.md` và 5 file `[]`; phần "chưa phát hành" liệt kê 2 zip LAD8 và 3 zip Stellar Blade; `git -C D:\Prjs\VH status --short` không đổi.
- [ ] **Step 6:** Chạy `npm run build`. Mong đợi: không lỗi schema.
- [ ] **Step 7:** Commit `feat: add sync command and seed the five games`.

---

### Task 7: Lệnh `release`

**Files:**
- Create: `scripts/lib/github.ts`, `scripts/release.ts`, `tests/scripts/github.test.ts`, `tests/scripts/release.test.ts`

**Interfaces:**
- Consumes: mọi module ở Task 3, 4, 5; `config.repo`.
- Produces:

```ts
// github.ts
export type Runner = (cmd: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>;
export function releaseTag(id: string, version: string): string;            // "<id>-v<version>"
export function assetUrl(repo: string, tag: string, fileName: string): string;
//  "https://github.com/<repo>/releases/download/<tag>/<fileName>", tên file được mã hóa URL
export function getExistingAssetSha(run: Runner, repo: string, tag: string, fileName: string): Promise<string | null | "no-release">;
//  "no-release" khi tag chưa có; null khi có release nhưng không có file đó; ngược lại là sha256 chữ thường (trường digest của gh, bỏ tiền tố "sha256:")
export function createRelease(run: Runner, input: { repo: string; tag: string; title: string; notes: string; zipPath: string }): Promise<void>;
// release.ts
export function runRelease(opts: {
  vhRoot: string; repoRoot: string; repo: string | null;
  id: string; version: string;
  notesFileText: string | null; gameBuildFlag: string | null;
  confirm: boolean; today: string; run: Runner; log: (line: string) => void;
}): Promise<{ outcome: "blocked" | "preview" | "published" | "resumed"; blocks: Block[]; release: Release | null }>;
```

- Thứ tự trong `runRelease`, đúng theo spec mục 7:
  1. `loadProject`, `findReleaseZip`.
  2. `listEntries`, `readRootTexts`, `checkPackage`. Có vi phạm → `log` từng vi phạm, trả `blocked`. Không gọi `run`.
  3. `sha256File` của zip; nếu có `<zip>.sha256` mà lệch → Error chứa "mã băm".
  4. `resolveReleaseInfo`.
  5. `log` tóm tắt: tên file, dung lượng, mã băm, số file trong gói, 20 file lớn nhất. `confirm` là false → trả `preview`. Không gọi `run`, không ghi kho.
  6. `repo` là null → Error chứa `vault.config.ts`. Gọi `getExistingAssetSha`: trùng mã băm → bỏ qua tải lên, đi tiếp, kết quả `resumed`; lệch hoặc `null` → Error chứa "đã tồn tại", không ghi kho.
  7. `"no-release"` → `createRelease`, tiêu đề `"<title> – Việt hóa v<version>"`.
  8. `upsertRelease`.
  9. `log` các lệnh `git add`, `git commit`, `git push` cần chạy tay. Không tự chạy git.
- CLI: `npm run release -- <id> <version> [--notes <file>] [--game-build <chuỗi>] [--confirm]`. Không có cờ nào tên `--allow-internal`; tham số lạ → in cách dùng, mã thoát 2. Mã thoát 1 khi `blocked` hoặc có Error. `Runner` thật gọi `gh`; nếu `gh` không có trên máy thì báo "Chưa cài GitHub CLI (gh)" thay vì in lỗi hệ thống.

- [ ] **Step 1:** Viết kiểm thử với `run` giả ghi lại mọi lời gọi

```ts
test("tag và url", () => {
  expect(releaseTag("lad8-infinite-wealth", "0.9.1")).toBe("lad8-infinite-wealth-v0.9.1");
  expect(assetUrl("a/b", "g-v1", "G v1.zip")).toBe("https://github.com/a/b/releases/download/g-v1/G%20v1.zip");
});
test("gói bị chặn: không gọi gh, không ghi kho", async () => {
  const r = await runRelease({ ...base, id: "sb", version: "0.3", confirm: true });
  expect(r.outcome).toBe("blocked");
  expect(r.blocks.map(b => b.rule)).toEqual(expect.arrayContaining(["internal-name", "no-distribute-notice"]));
  expect(calls).toEqual([]); expect(readStore(repoRoot, "sb")).toEqual([]);
});
test("không có --confirm thì chỉ xem trước", async () => {
  const r = await runRelease({ ...base, id: "lad8", version: "0.9.1", confirm: false });
  expect(r.outcome).toBe("preview"); expect(calls).toEqual([]);
  expect(readStore(repoRoot, "lad8")).toEqual([]);
  expect(logs.join("\n")).toContain("LAD8-VietHoa-v0.9.1.zip");
});
test("file .sha256 lệch thì dừng trước khi tải", async () => {
  await expect(runRelease({ ...base, id: "lech", version: "1.0", confirm: true })).rejects.toThrow(/mã băm/);
  expect(calls).toEqual([]);
});
test("phát hành mới: tạo release rồi ghi kho", async () => {
  // run giả: xem release → không có; tạo → code 0
  const r = await runRelease({ ...base, id: "lad8", version: "0.9.1", confirm: true });
  expect(r.outcome).toBe("published");
  expect(r.release).toMatchObject({ version: "0.9.1", fileName: "LAD8-VietHoa-v0.9.1.zip", gameBuild: "17233673", date: "2026-11-27",
    url: "https://github.com/chu/kho/releases/download/lad8-v0.9.1/LAD8-VietHoa-v0.9.1.zip" });
  expect(readStore(repoRoot, "lad8")).toHaveLength(1);
  expect(calls.every(c => c.cmd === "gh")).toBe(true);
});
test("chạy lại sau khi hỏng giữa chừng: không tải lại", async () => {
  // run giả: release đã có, digest trùng
  const r = await runRelease({ ...base, id: "lad8", version: "0.9.1", confirm: true });
  expect(r.outcome).toBe("resumed");
  expect(calls.some(c => c.args.includes("create"))).toBe(false);
  expect(readStore(repoRoot, "lad8")).toHaveLength(1);
});
test("tag đã có nhưng file khác: dừng, không ghi kho", async () => {
  await expect(runRelease({ ...base, id: "lad8", version: "0.9.1", confirm: true })).rejects.toThrow(/đã tồn tại/);
  expect(readStore(repoRoot, "lad8")).toEqual([]);
});
test("chưa cấu hình repo", async () => {
  await expect(runRelease({ ...base, repo: null, id: "lad8", version: "0.9.1", confirm: true })).rejects.toThrow(/vault\.config\.ts/);
});
test("tải lên thất bại thì không ghi kho", async () => {
  // run giả: tạo → code 1
  await expect(runRelease({ ...base, id: "lad8", version: "0.9.1", confirm: true })).rejects.toThrow();
  expect(readStore(repoRoot, "lad8")).toEqual([]);
});
```

- [ ] **Step 2:** Chạy `npm test`. Mong đợi: FAIL.
- [ ] **Step 3:** Viết `github.ts` và `release.ts`. Đọc `gh release view --help` và `gh release create --help` trong tài liệu chính thức để lấy đúng tên cờ và trường JSON; ghi các lời gọi đó vào chú thích đầu file `github.ts`.
- [ ] **Step 4:** Chạy `npm test`. Mong đợi: PASS.
- [ ] **Step 5:** Chạy thử với VH thật, **không** có `--confirm`:
  - `npm run release -- lad8-infinite-wealth 0.9.1` → in tóm tắt, mã băm `ace2671339613ef91c5946f3cbc3f53a28a3b3e7c9e78892d700ea66a671b9df`, `gameBuild` 17233673, dừng ở xem trước.
  - `npm run release -- stellar-blade 0.3` → bị chặn, nêu ít nhất `internal-name` và `no-distribute-notice`, mã thoát 1.
  - `git status --short` ở cả hai repo không đổi.
- [ ] **Step 6:** Commit `feat: add release command with preview, hard blocks and resume`.

---

### Task 8: Trang chủ

**Files:**
- Create: `src/components/ProgressBar.astro`, `src/components/GameCard.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getGames()`, `STATUS_LABEL`, `Base.astro`.
- Produces: `GameCard` nhận `{ entry, latest }`; `ProgressBar` nhận `{ value: number; label: string }`.

- [ ] **Step 1:** Viết `ProgressBar`: thanh có `role="progressbar"` và `aria-valuenow`, nền `#2A2418`, phần đầy `#D9B25F`.
- [ ] **Step 2:** Viết `GameCard`, cả thẻ là một liên kết tới `/game/<id>/`: ảnh bìa (hoặc khung trống mang tên game khi chưa có ảnh), tên game, hệ máy, dòng trạng thái "`<nhãn>` · `<progress>`%", thanh tiến độ. Có `latest` thì viền `#D9B25F` và thêm dòng "Tải bản v`<version>`"; không có thì viền `#4A3F28`.
- [ ] **Step 3:** Viết `index.astro`: tiêu đề "Những bản Việt hóa được cất giữ cẩn thận", dòng phụ "`<số game>` game · dịch bởi Zaldor (Vergilize) · miễn phí", lưới thẻ 3 cột trên màn rộng, 2 cột ở bề rộng trung bình, 1 cột dưới 640px.
- [ ] **Step 4:** Chạy `npm run check` và `npm run build`. Mong đợi: không lỗi; `dist/index.html` có 5 liên kết `/game/…/` và không có chuỗi "Tải bản".
- [ ] **Step 5:** Chạy `VAULT_FIXTURES=1 npm run build`. Mong đợi: `dist/index.html` có đúng một "Tải bản v0.9.1" và thẻ LAD8 đứng đầu.
- [ ] **Step 6:** Commit `feat: add home page with game cards`.

---

### Task 9: Trang chi tiết game

**Files:**
- Create: `src/pages/game/[id].astro`, `src/components/DownloadBlock.astro`, `src/components/Changelog.astro`, `src/components/ReportBug.astro`, `src/components/Comments.astro`, `src/lib/links.ts`, `tests/site/links.test.ts`

**Interfaces:**
- Consumes: `getGames()`, `formatBytes`, `formatDate`, `config`.
- Produces, trong `src/lib/links.ts`:

```ts
export function issueUrl(repo: string | null, game: { title: string }, version: string | null): string | null;
//  null khi repo null. Ngược lại: https://github.com/<repo>/issues/new?title=...&body=...
//  title: "[<tên game>] Lỗi dịch: "   body có hai dòng "Game: <tên>" và "Phiên bản patch: <version hoặc 'chưa phát hành'>"
```

- Thứ tự khối trên trang đúng theo spec mục 8, từ 1 đến 9.
- `DownloadBlock`: có `latest` thì hiện phiên bản, ngày, dung lượng, SHA-256 dạng chữ đơn cách, nút "Tải bản v`<version>`", và dòng "Hỗ trợ: `<edition>`, bản game `<gameBuild>`". Không có thì hiện "Chưa có bản phát hành." và không có nút. Nút tải là phần tử duy nhất dùng nền `#D9B25F`.
- `Changelog`: mọi bản, mới nhất ở trên; mỗi bản có phiên bản, ngày, `notes` (giữ xuống dòng), liên kết tải. Không có bản nào thì không hiện cả khối.
- `ReportBug`: nút "Báo lỗi dịch" dẫn tới `issueUrl`; khi `issueUrl` trả null thì không hiện.
- `Comments`: khi `config.giscus` và `config.repo` đều khác null thì nhúng Giscus, ánh xạ theo `specific` với term là `id` game, giao diện tối, ngôn ngữ `vi`, tải lười. Ngược lại không xuất ra gì, không có thẻ script nào.

- [ ] **Step 1:** Viết kiểm thử

```ts
test("chưa nối repo thì không có liên kết báo lỗi", () => {
  expect(issueUrl(null, { title: "X" }, "1.0")).toBeNull();
});
test("liên kết báo lỗi điền sẵn game và phiên bản", () => {
  const u = new URL(issueUrl("chu/kho", { title: "Zelda: OoT 3D" }, "0.9.1")!);
  expect(u.origin + u.pathname).toBe("https://github.com/chu/kho/issues/new");
  expect(u.searchParams.get("title")).toBe("[Zelda: OoT 3D] Lỗi dịch: ");
  expect(u.searchParams.get("body")).toContain("Phiên bản patch: 0.9.1");
  expect(new URL(issueUrl("chu/kho", { title: "X" }, null)!).searchParams.get("body")).toContain("chưa phát hành");
});
```

- [ ] **Step 2:** Chạy `npm test`. Mong đợi: FAIL.
- [ ] **Step 3:** Viết `links.ts`, bốn component và trang `[id].astro` (dùng `getStaticPaths` từ `getGames()`).
- [ ] **Step 4:** Chạy `npm test`, `npm run check`, `npm run build`. Mong đợi: PASS; có 5 trang `dist/game/<id>/index.html`; mỗi trang chứa "Chưa có bản phát hành."; không trang nào chứa `giscus` hay `github.com`.
- [ ] **Step 5:** Chạy `VAULT_FIXTURES=1 npm run build`. Mong đợi: trang LAD8 có "Tải bản v0.9.1", "bản game 17233673", và hai mục changelog theo thứ tự 0.9.1 rồi 0.9.0.
- [ ] **Step 6:** Commit `feat: add game detail page`.

---

### Task 10: Trang phụ, README và kiểm tra bằng mắt

**Files:**
- Create: `src/pages/huong-dan.astro`, `src/pages/gioi-thieu.astro`, `src/pages/404.astro`, `src/components/Donate.astro`, `README.md`

**Interfaces:**
- Consumes: `Base.astro`, `config`.

- [ ] **Step 1:** Viết `/huong-dan/` gồm ba mục: bản vá là gì và vì sao cần game gốc; các bước chung để cài (tải, kiểm tra mã băm, làm theo hướng dẫn của từng game); cách kiểm tra SHA-256 trên Windows với lệnh `Get-FileHash <tên file> -Algorithm SHA256`.
- [ ] **Step 2:** Viết `/gioi-thieu/`: một đoạn về Zaldor (Vergilize) có ghi rõ là chữ giữ chỗ chờ người dùng viết, câu miễn trừ, và `Donate`. `Donate` chỉ xuất ra nút khi `config.donate` khác null.
- [ ] **Step 3:** Viết `404.astro`: "Không tìm thấy trang này." và liên kết "Về kho game".
- [ ] **Step 4:** Viết `README.md` bằng tiếng Việt: yêu cầu (Node 24), các lệnh npm, cách đặt `VH_ROOT`, cách thêm game và sửa nội dung, quy trình phát hành từng bước, ba quy tắc chặn và cách xử lý khi bị chặn (đóng gói lại bên VH), cách xóa tay một Release trên GitHub và mục tương ứng trong JSON, và danh sách sáu việc cần người dùng trước khi đưa lên mạng (spec mục 12).
- [ ] **Step 5:** Chạy `npm test`, `npm run check`, `npm run build`. Mong đợi: tất cả sạch; `dist/` có `huong-dan/index.html`, `gioi-thieu/index.html`, `404.html`; không file nào trong `dist/` chứa "Ủng hộ" hay liên kết donate.
- [ ] **Step 6:** Chạy máy chủ xem trước với `VAULT_FIXTURES=1` và mở trong trình duyệt ở bề rộng máy tính và 375px. Kiểm tra: trang chủ, trang LAD8 (có nút tải), trang Zelda (chưa có bản), `/huong-dan/`, một đường dẫn sai. Mong đợi: dấu tiếng Việt hiển thị đúng ở cả hai phông, không cuộn ngang ở 375px, chữ `#A99B7C` trên nền `#16130E` đọc được, console không có lỗi, tab mạng không có yêu cầu nào ra máy chủ ngoài. Chụp ảnh màn hình trang chủ và trang LAD8 để báo cáo.
- [ ] **Step 7:** Xác nhận lần cuối: `git status --short` sạch sau commit; `src/data/releases/*.json` đều là `[]`; `git -C D:\Prjs\VH status --short` không đổi so với trước Task 1.
- [ ] **Step 8:** Commit `feat: add guide, about and 404 pages; document the workflow`.

---

## Sau kế hoạch này

Không thuộc phạm vi, mỗi việc cần người dùng đồng ý vào lúc làm: cài `gh`; tạo repo công khai và push; điền `repo` và `giscus` trong `vault.config.ts`; nối Cloudflare Pages; chạy `release --confirm` cho LAD8; thay chữ giữ chỗ bằng ảnh, số tiến độ và nội dung thật.
