# Zaldor's Vault: bản thiết kế

Ngày: 2026-11-27. Trạng thái: chờ duyệt.

Ký hiệu: **[Bạn chọn]** là điều người dùng đã quyết trong buổi trao đổi.
**[Đề xuất]** là điều người viết tự chọn, người dùng chưa xác nhận.

## 1. Mục đích

Một trang web công khai, tiếng Việt, nơi người chơi tìm và tải các bản Việt
hóa game do Zaldor làm. Trang miễn phí, có chỗ cho nút donate. Người dùng
muốn mỗi lần ra bản mới chỉ tốn một lệnh, kể cả khi số bản phát hành tăng
lên nhiều.

## 2. Mục tiêu, ngoài phạm vi, điều phải tránh

**Mục tiêu bản đầu**

- Trang chủ liệt kê cả 5 game, ghi rõ trạng thái và tiến độ. **[Bạn chọn]**
- Trang chi tiết mỗi game: ảnh bìa và ảnh trong game, tiến độ, phiên bản
  patch, phiên bản và hệ máy game được hỗ trợ, hướng dẫn cài, changelog,
  credit, nút tải. **[Bạn chọn]**
- Nút báo lỗi dịch dẫn tới GitHub Issues. **[Bạn chọn]**
- Bình luận dưới mỗi game bằng Giscus. **[Bạn chọn]**
- Vị trí nút donate làm sẵn nhưng ẩn cho tới khi có thông tin. **[Bạn chọn]**
- Một lệnh phát hành: đọc thư mục dự án VH, đẩy file lên GitHub Releases,
  cập nhật dữ liệu trang. **[Bạn chọn]**

**Ngoài phạm vi bản đầu**

- Tài khoản người dùng, trang admin, thanh toán.
- Giao diện tiếng Anh.
- Đếm lượt tải, tìm kiếm, lọc (5 game chưa cần).
- Giao diện sáng. Bản đầu chỉ có tông tối. **[Đề xuất]**

**Điều phải tránh (làm được mà vẫn coi là hỏng)**

- File game gốc, ROM hoặc bản game chạy được xuất hiện trên trang hay trong
  repo. Trang chỉ phát hành patch/mod. **[Bạn chọn]** Gói mod chỉ gồm các
  file đã sửa cần cho bản dịch (như LAD8 v0.9.1) được phép. Gói chứa tệp
  gốc của game (như `.pak` của Stellar Blade v0.3) thì không. **[Bạn chọn]**
- Dữ liệu làm việc của VH (bản dịch thô, glossary, `original/`, `work/`)
  lọt vào repo công khai này.
- Bản nội bộ (ví dụ `StellarBlade-VH-v0.3-internal.zip`) bị đẩy lên công
  khai do sơ ý.
- Trang ghi một game "tải được" trong khi chưa có file công khai.

## 3. Hiện trạng đã kiểm tra (2026-11-27)

- VH ở `D:\Prjs\VH`. Thư mục `projects/` bị repo VH bỏ qua (`.gitignore`).
- 5 dự án: `lad8-infinite-wealth`, `persona4-golden`, `persona5-royal`,
  `stellar-blade`, `zelda-oot3d`.
- `project.json` của mỗi dự án có `id`, `title`, `platform`, `edition`,
  `version`. Không có trường tiến độ %.
- `release/` hiện có:
  - LAD8: `LAD8-VietHoa-v0.9.0.zip`, `LAD8-VietHoa-v0.9.1.zip`, mỗi file
    kèm `.zip.sha256`.
  - Stellar Blade: ba file `...-internal.zip`, không có `.sha256`.
  - Persona 4 Golden, Persona 5 Royal, Zelda OoT3D: trống.
- Máy chưa cài `gh` (GitHub CLI).

## 4. Các hướng đã cân nhắc

| Hướng | Được gì | Mất gì |
|---|---|---|
| **A. Trang tĩnh Astro, dữ liệu sinh từ VH, file trên GitHub Releases** | Miễn phí, không có backend để bị tấn công, phát hành bằng một lệnh | Bình luận và báo lỗi cần tài khoản GitHub |
| B. Next.js có trang admin và database | Upload từ bất kỳ máy nào, nhiều người cùng đăng | Phải nuôi backend, database, bảo mật; quá mức cho một người phát hành |
| C. Trang tĩnh, sửa file dữ liệu bằng tay | Đơn giản nhất | Dễ sai link, sai mã băm, lệch phiên bản khi số bản tăng |

**Đã chọn: A.** **[Bạn chọn]** Astro vẫn mở rộng được về sau: nhúng
component tương tác vào từng chỗ, hoặc bật chế độ chạy server trên
Cloudflare khi cần API.

## 5. Kiến trúc

```
D:\Prjs\VH\projects\<id>\          (chỉ đọc)
   project.json, release\*.zip, *.zip.sha256
            |
            |  npm run release -- <id> <version>
            v
D:\Prjs\vh-store                   (repo công khai)
   src\content\games\<id>.md       nội dung viết tay
   src\data\releases\<id>.json     do lệnh sinh ra
            |                             |
            | git push                    | tải file lên
            v                             v
   Cloudflare Pages (trang)        GitHub Releases (file .zip)
```

- **Công nghệ:** Astro, xuất trang tĩnh, TypeScript. **[Bạn chọn]** Không
  dùng framework giao diện trong bản đầu. **[Đề xuất]**
- **Host trang:** Cloudflare Pages. **[Bạn chọn]**
- **Nơi lưu file:** GitHub Releases của chính repo này. **[Bạn chọn]** Mỗi
  bản một tag dạng `<id>-v<version>`, ví dụ `lad8-infinite-wealth-v0.9.1`.
  **[Đề xuất]**
- **Script:** viết bằng Node, nằm trong `scripts/`, để repo chỉ cần một môi
  trường chạy. **[Đề xuất]**
- **Đường dẫn VH:** đọc từ biến `VH_ROOT` trong file `.env` không commit,
  mặc định `D:\Prjs\VH`. **[Đề xuất]**

## 6. Dữ liệu

Mỗi game có hai nguồn, tách bạch người viết và máy viết.

**`src/content/games/<id>.md`, viết tay.** Phần đầu file:

| Trường | Ý nghĩa |
|---|---|
| `id` | trùng `projects/<id>` bên VH |
| `title`, `platform`, `edition` | lệnh `sync` điền từ `project.json` khi tạo file hoặc khi trường còn trống; không bao giờ ghi đè giá trị đã có **[Đề xuất]** |
| `status` | `dang-dich`, `hoan-thanh` hoặc `tam-dung`, nhập tay |
| `progress` | số 0 đến 100, nhập tay |
| `tagline` | một câu giới thiệu |
| `cover`, `screenshots` | đường dẫn ảnh trong `src/assets/games/<id>/` |
| `credits` | danh sách tên và vai trò |

Thân file là Markdown, gồm phần giới thiệu và phần hướng dẫn cài đặt.

Tiến độ nhập tay vì `project.json` không có số này và mỗi dự án đo tiến độ
một kiểu. **[Đề xuất]**

**`src/data/releases/<id>.json`, do lệnh sinh.** Một mảng, mỗi phần tử là
một bản: `version`, `date`, `fileName`, `sizeBytes`, `sha256`, `url`,
`gameBuild` (bản game mà bản patch này hỗ trợ), `notes` (changelog của bản
đó).

Bản game được hỗ trợ ghi theo từng bản phát hành, không theo game, vì trình
cài LAD8 chỉ nhận đúng một build và dự án sẽ chuyển sang build mới về sau.
Chuỗi `version` trong `project.json` là ghi chú nội bộ dài, không đưa
thẳng lên trang. **[Đề xuất]**

**Trạng thái và nút tải là hai chuyện độc lập.** **[Đề xuất]**

- Nút tải hiện khi và chỉ khi file releases có ít nhất một bản.
- `status` và `progress` luôn hiện. LAD8 có thể vừa "Đang dịch 90%" vừa có
  nút tải bản 0.9.1.
- Lúc build, trang báo lỗi và dừng nếu một game ghi `hoan-thanh` mà không
  có bản phát hành nào.

**Tên credit:** "Zaldor (Vergilize)" ở credit mặc định và trang giới
thiệu. **[Bạn chọn]**

## 7. Lệnh

**`npm run sync`** chỉ đọc, không đẩy gì ra ngoài.

- Đọc `project.json` của từng dự án, tạo file `<id>.md` nếu chưa có, điền
  các trường còn trống.
- Liệt kê các file `.zip` trong `release/` mà chưa được phát hành.

**`npm run release -- <id> <version> [--notes <file>] [--game-build <chuỗi>]`**
theo thứ tự:

1. Tìm đúng một file `.zip` trong `release/` có tên chứa `v<version>`.
   Không thấy hoặc thấy hơn một thì dừng.
2. **Chặn cứng, không có cờ nào vượt qua** **[Bạn chọn]**:
   - tên file zip chứa `internal`;
   - một file bên trong zip có SHA-256 trùng với một mục trong `inputs` của
     `project.json`;
   - một file văn bản ở gốc gói (README, ghi chú) chứa "KHONG PHAN PHOI"
     hoặc "NOI BO". **[Đề xuất]**

   Muốn công khai một bản đang bị chặn thì đóng gói lại bên VH.
3. Tính SHA-256. Nếu có file `.sha256` bên cạnh thì so, lệch thì dừng.
4. Lấy thông tin bản phát hành **[Đề xuất]**:
   - `notes`: từ `--notes`; nếu không có thì từ `PHAT-HANH.txt` trong gói;
     không có cả hai thì dừng và yêu cầu `--notes`.
   - `date` và `gameBuild`: từ `manifest.json` trong gói nếu có; nếu không
     thì `date` là hôm nay và `gameBuild` bắt buộc qua `--game-build`.
   - Không đọc gì khác từ gói. Hướng dẫn cài và credit trên trang viết tay.
5. In tóm tắt: tên file, dung lượng, mã băm, số file trong gói, 20 file
   lớn nhất. Dừng ở đây. Chỉ đi tiếp khi có cờ `--confirm`.
6. Nếu tag ở mục 5 đã tồn tại trên GitHub: so mã băm file đã tải lên. Trùng
   thì bỏ qua bước tải và làm tiếp bước 7 (chạy lại sau khi hỏng giữa
   chừng). Lệch thì dừng; bản đã phát hành không bị ghi đè, sửa lỗi thì ra
   số phiên bản mới.
7. Tạo GitHub Release và tải file lên.
8. Ghi bản mới vào `src/data/releases/<id>.json`.
9. Không tự commit, không tự push. In ra các lệnh cần chạy tiếp.

Không có lệnh gỡ bản phát hành. Tài liệu README ghi cách xóa tay một
Release trên GitHub và xóa mục tương ứng trong file JSON. **[Đề xuất]**

Bước 6 dùng `gh`. Máy chưa có `gh`, việc cài đặt cần người dùng đồng ý
(xem mục 12).

## 8. Các trang

| Đường dẫn | Nội dung |
|---|---|
| `/` | Tiêu đề, một câu giới thiệu, lưới thẻ 5 game |
| `/game/<id>/` | Trang chi tiết game |
| `/huong-dan/` | Hướng dẫn chung: patch là gì, cần game gốc, cách kiểm tra SHA-256 |
| `/gioi-thieu/` | Về Zaldor, nút donate (ẩn), lời miễn trừ |
| 404 | Trang không tìm thấy |

**Trang chi tiết game, từ trên xuống:**

1. Ảnh bìa, tên game, hệ máy, trạng thái, thanh tiến độ.
2. Khối tải: phiên bản mới nhất, ngày, dung lượng, SHA-256, nút tải, và
   dòng "Hỗ trợ: `<edition>`, `<gameBuild>`". Nếu chưa có bản nào thì
   khối này ghi "Chưa có bản phát hành".
3. Ảnh trong game.
4. Giới thiệu.
5. Hướng dẫn cài đặt.
6. Changelog, mới nhất ở trên, kèm link tải các bản cũ.
7. Credit.
8. Nút "Báo lỗi dịch": mở form GitHub Issues đã điền sẵn tên game và phiên
   bản.
9. Bình luận Giscus, mỗi game một luồng theo `id`.

Chân trang mọi trang: "Zaldor's Vault chỉ phát hành bản vá ngôn ngữ. Bạn
cần có bản game gốc hợp lệ. Trang không liên kết với nhà phát hành nào."

## 9. Giao diện

Hướng "Hầm kho báu" (mẫu A). **[Bạn chọn]**

| Vai trò | Màu |
|---|---|
| Nền | `#16130E` |
| Nền khối | `#2A2418` |
| Chữ chính | `#EDE4D0` |
| Chữ phụ | `#A99B7C` |
| Nhấn (vàng đồng) | `#D9B25F` |
| Viền | `#4A3F28` |

- Tiêu đề dùng chữ có chân, thân bài dùng chữ không chân. Cả hai phải hiển
  thị đủ dấu tiếng Việt và được đặt trong repo, không tải từ máy chủ ngoài.
  **[Đề xuất]** Người dựng chọn phông cụ thể.
- Thẻ game có bản tải được thì viền vàng; thẻ đang dịch thì viền thường và
  thanh tiến độ vàng.
- Dùng được trên điện thoại: lưới thẻ từ 3 cột về 1 cột.
- Nút tải là hành động chính duy nhất trên trang chi tiết.

**Ảnh.** Ảnh bìa chính thức của game có bản quyền. Bản đầu dùng ảnh chụp
màn hình bản Việt hóa do người dùng cung cấp; game chưa có ảnh thì hiện
khung trống mang tên game. **[Đề xuất]**

## 10. Kiểm thử

- Kiểm thử tự động cho script: đọc `project.json`, so SHA-256 đúng và sai,
  ba kiểu chặn cứng ở mục 7, không tìm thấy file, tìm thấy hai file trùng
  phiên bản, `sync` không ghi đè trường đã có. Dùng thư mục VH giả, không
  đụng dữ liệu thật.
- Trong repo, file releases của cả 5 game để trống cho tới khi có bản được
  đẩy lên thật, nên không có link chết. Để xem trang có nút tải, trang đọc
  dữ liệu mẫu trong `tests/fixtures/` khi chạy với `VAULT_FIXTURES=1`; bản
  build thật không bao giờ đọc thư mục này. **[Đề xuất]**
- `astro check` và `astro build` chạy sạch.
- Kiểm tra bằng mắt trên trình duyệt ở bề rộng máy tính và điện thoại:
  trang chủ, một game có bản tải (LAD8), một game chưa có.
- Bước tải file lên GitHub không được chạy trong kiểm thử tự động.

## 11. Để người dựng tự quyết

- Phông chữ cụ thể, khoảng cách, chuyển động nhỏ.
- Cấu trúc thư mục component và cách đặt tên bên trong.
- Thư viện kiểm thử và thư viện đọc file zip.
- Câu chữ giao diện, miễn là tiếng Việt, ngắn, không viết hoa toàn bộ.

## 12. Cần người dùng trước khi đưa lên mạng

Những việc này không cản việc dựng và chạy trang trên máy.

1. Tài khoản GitHub và tên repo công khai (đề xuất: `zaldors-vault`). Việc
   tạo repo trên GitHub và push cần người dùng đồng ý vào lúc đó.
2. Cài `gh` để lệnh `release` tải file lên được.
3. Bật Discussions trên repo và cài ứng dụng Giscus để có bình luận.
4. Nối repo với Cloudflare Pages; tên miền riêng nếu muốn.
5. Ảnh chụp màn hình, số tiến độ, câu giới thiệu và hướng dẫn cài cho từng
   game. Bản đầu dùng chữ giữ chỗ ghi rõ là chưa có.
6. Xác nhận bản nào được phép công khai. Hiện chỉ LAD8 v0.9.0 và v0.9.1
   qua được quy tắc chặn; Stellar Blade v0.1 đến v0.3 bị chặn. Chưa bản nào
   được đẩy lên khi chưa hỏi.
