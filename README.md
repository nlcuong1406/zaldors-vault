# Zaldor's Vault

Trang tĩnh (Astro) đăng các bản vá Việt hóa game của Zaldor (Vergilize). Trang chỉ phát hành bản vá ngôn ngữ, không phát hành game. File bản vá nằm trên GitHub Releases; repo này chỉ giữ mã trang, nội dung và danh sách bản phát hành.

## Yêu cầu

- Node 24 trở lên và npm.
- Thư mục dự án VH (mặc định `D:\Prjs\VH`). Chỉ được đọc, các lệnh ở đây không bao giờ ghi vào đó.
- `gh` (GitHub CLI), chỉ cần khi chạy `release --confirm`.

```
npm install
```

## Lệnh npm

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Chạy trang ở máy để xem và sửa |
| `npm run build` | Dựng trang vào `dist/` |
| `npm run preview` | Xem lại bản đã dựng |
| `npm run check` | Kiểm tra kiểu của Astro và TypeScript |
| `npm test` | Chạy bộ kiểm thử (không đọc VH thật, không dùng mạng) |
| `npm run sync` | Đọc VH, tạo hoặc điền file game, liệt kê zip chưa phát hành |
| `npm run release -- <id> <version> ...` | Phát hành một bản vá (xem bên dưới) |

### Đặt VH_ROOT

Các lệnh tìm thư mục VH theo thứ tự: biến môi trường `VH_ROOT`, rồi file `.env` ở gốc repo, rồi mặc định `D:\Prjs\VH`. Để đổi, sao chép `.env.example` thành `.env` và sửa:

```
VH_ROOT=D:\Prjs\VH
```

### Xem thử với dữ liệu mẫu

Đặt `VAULT_FIXTURES=1` để trang dùng dữ liệu bản phát hành mẫu trong `tests/fixtures/` thay cho `src/data/releases/` (giúp xem khối tải và changelog khi chưa phát hành gì thật).

```
$env:VAULT_FIXTURES = "1"; npm run dev
```

Không bao giờ đặt biến này khi dựng bản đưa lên mạng.

## Thêm game và sửa nội dung

1. Tạo dự án mới bên VH, rồi chạy `npm run sync`. Lệnh này tạo `src/content/games/<id>.md` nếu chưa có, và chỉ điền các trường còn trống (`title`, `platform`, `edition`). Nó không ghi đè gì bạn đã viết, cũng không đẩy gì ra ngoài. Nó cũng tạo `src/data/releases/<id>.json` (là `[]`) và báo các zip chưa phát hành.
2. Sửa `src/content/games/<id>.md`. Phần đầu file (front matter) có các trường:
   - `id`, `title`, `platform`, `edition`
   - `status`: `dang-dich`, `hoan-thanh` hoặc `tam-dung`
   - `progress`: số nguyên từ 0 đến 100
   - `tagline`: một câu giới thiệu ngắn
   - `cover`: ảnh bìa (tùy chọn)
   - `screenshots`: danh sách ảnh trong game (tùy chọn)
   - `credits`: danh sách `name` và `role`
3. Phần thân file viết hai mục: `## Giới thiệu` và `## Hướng dẫn cài đặt`.
4. Ảnh để trong `src/assets/games/<id>/` và trỏ tới bằng đường dẫn tương đối, ví dụ `cover: ../../assets/games/<id>/cover.jpg`.
5. Đừng bỏ bản dịch thô, glossary hay file game vào repo.

## Phát hành một bản vá

Ví dụ phát hành LAD8 v0.9.1.

1. `npm run sync` để xem zip nào chưa phát hành.
2. Xem trước, chưa có gì được tải lên hay ghi lại:

   ```
   npm run release -- lad8-infinite-wealth 0.9.1
   ```

   Lệnh chọn file zip trong `release/` của dự án theo mã phiên bản: tên phải chứa `v0.9.1`, trước chữ `v` không được là chữ hay số, và sau số phiên bản không được còn chữ số hay `.<số>` (nên 0.9.1 không khớp v0.9.10). Phải có đúng một file khớp, không thì lệnh dừng. Sau đó lệnh chạy các quy tắc chặn, tính SHA-256, so với file `.zip.sha256` bên cạnh (nếu có), rồi in tên file, dung lượng, mã băm, số file và 20 file lớn nhất. Nếu file `.zip.sha256` ghi mã khác hoặc không đọc được thì lệnh dừng với mã 1, kể cả khi chỉ xem trước.

   Cờ tùy chọn:
   - `--notes <file>`: file ghi chú. Nếu không có thì lấy `PHAT-HANH.txt` trong gói; không có cả hai thì lệnh dừng.
   - `--game-build <chuỗi>`: bản game được hỗ trợ. Bắt buộc nếu gói không có `manifest.json`. Ngày và bản game lấy từ `manifest.json` khi có.
3. Đọc kỹ bản xem trước. Nếu đúng, chạy lại đúng lệnh đó kèm `--confirm`:

   ```
   npm run release -- lad8-infinite-wealth 0.9.1 --confirm
   ```

   Lệnh tạo GitHub Release `<id>-v<version>`, tải file lên, kiểm tra lại mã băm trên GitHub, rồi ghi bản mới vào `src/data/releases/<id>.json`. Cần `repo` trong `vault.config.ts` và `gh` đã đăng nhập.
4. Lệnh không tự chạy git. Nó in ra ba lệnh để bạn tự chạy:

   ```
   git add src/data/releases/<id>.json
   git commit -m "release: <id> v<version>"
   git push
   ```

Mã thoát: 0 là thành công (kể cả bản xem trước); 1 là bị chặn hoặc có lỗi; 2 là gõ sai tham số.

Một số lưu ý khác:

- Tên file zip chỉ nhận chữ, số, `.`, `_`, `-` khi `--confirm`; mã dự án chỉ nhận chữ thường, số, `-`; phiên bản chỉ nhận số và dấu chấm (ví dụ `0.9.1`).
- Chạy lại sau khi hỏng giữa chừng thì an toàn: nếu Release đã có file giống hệt (cùng SHA-256), lệnh bỏ qua bước tải lên và ghi tiếp vào JSON.
- Nếu tag đã tồn tại với file khác, lệnh dừng với thông báo "đã tồn tại". Bản đã phát hành không bao giờ bị ghi đè; muốn sửa lỗi thì ra số phiên bản mới.
- Release ở trạng thái nháp bị từ chối, và sau khi tải lên lệnh kiểm tra lại trước khi ghi vào kho.

## Bốn quy tắc chặn

Không có cờ nào vượt qua được các quy tắc này. Bản bị chặn sẽ in `[tên quy tắc]` cùng chi tiết và dừng với mã 1. Thứ tự in: `internal-name`, `original-file`, `container-file`, `no-distribute-notice`.

1. `internal-name`: tên file zip chứa `internal` (không phân biệt hoa thường).
2. `original-file`: một file bất kỳ trong zip, ở thư mục nào cũng được, có SHA-256 trùng với một mục trong `inputs` của `project.json`, tức là file game gốc.
3. `container-file`: một mục trong zip có tên file kết thúc bằng `.pak`, `.ucas` hoặc `.utoc` (không phân biệt hoa thường). Đây là các container của Unreal có thể chứa file game gốc mà quy tắc băm không nhìn thấy. Chỉ xét phần đuôi: `pak.txt` hay `x.pakfile` không bị chặn.
4. `no-distribute-notice`: một file văn bản ở gốc gói (`.txt`, `.md`, `.json`) chứa "không phân phối" hoặc "nội bộ" (so sánh bỏ dấu, không phân biệt hoa thường). Ghi chú truyền qua `--notes` cũng được kiểm tra bằng đúng cách này, và nếu dính thì báo `[no-distribute-notice] --notes`.

Lệnh cũng dừng (không phát hành) khi gói trông đáng ngờ: file văn bản không phải UTF-8 hay UTF-16 có BOM, văn bản chứa ký tự NUL, tên mục trong zip bị trùng (kể cả khác hoa thường), hoặc tên mục lạ (rỗng, bắt đầu bằng `/`, phần nào kết thúc bằng dấu chấm hoặc dấu cách). Lý do là nếu không đọc chắc chắn được thì không công khai.

**Khi bị chặn:** đóng gói lại bên VH cho đúng (bỏ file gốc, bỏ ghi chú nội bộ, đổi tên), rồi chạy lại. Không sửa trang để lách.

### Giới hạn đã biết

- Quy tắc file gốc so từng file trong zip ở mọi độ sâu thư mục, nhưng không nhìn được vào bên trong một container đóng gói. Khoảng hở với `.pak`, `.ucas`, `.utoc` nay đã đóng bằng cách chặn hẳn các container đó (`container-file`). Một gói thực sự cần file `.pak` sẽ phải được phát hành bằng cách khác, sau khi chủ trang tự đổi quy tắc này. Với các định dạng container khác, người phát hành vẫn phải tự xem 20 file lớn nhất trong bản xem trước.
- Quy tắc ghi chú chỉ là so khớp chuỗi con sau khi bỏ dấu. Câu như "không phân phối lại" trong một ghi chú giấy phép cũng sẽ bị chặn dù vô hại; khi đó đổi cách viết trong gói bên VH.

## Phát hành lần đầu

Làm lần lượt theo thứ tự:

1. Tạo repo công khai trên GitHub rồi push.
2. Cài `gh` bằng `winget install --id GitHub.cli`, rồi chạy `gh auth login`.
3. Điền `repo` (dạng `chu-so-huu/ten-repo`) trong `vault.config.ts`.
4. Chạy `npm run release -- <id> <version>` (bản xem trước) và đọc kỹ 20 file lớn nhất.
5. Trước lần `--confirm` đầu tiên, kiểm tra `gh` trả đúng trường mà lệnh cần, bằng cách xem bản phát hành mới nhất của một repo công khai có sẵn file tải, ví dụ `gh release view --repo cli/cli --json assets,isDraft` (repo của bạn lúc này chưa có tag nào). Xác nhận kết quả có `assets[].digest` dạng `sha256:...` và có `isDraft`. Nếu `gh` cũ không có `digest` thì cập nhật `gh`.
6. Chạy lại lệnh ở bước 4 kèm `--confirm`.
7. Mở link tải trên trang Release, tải file về, chạy `Get-FileHash <file>` (SHA-256) và so với mã băm đã in.
8. Commit và push file JSON trong `src/data/releases/`.
9. Chờ Cloudflare build xong, rồi bấm thử nút tải trên trang thật.

### Cài đặt Cloudflare

Trang chạy trên một Cloudflare Worker chỉ phục vụ file tĩnh, cấu hình ở `wrangler.jsonc` (tên Worker `zaldors-vault`, thư mục `dist`, đường dẫn sai trả `404.html`). Có file này thì `npx wrangler deploy` không tự sửa dự án.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node 24: đặt biến môi trường `NODE_VERSION=24`
- Không đặt `VAULT_FIXTURES`. Nếu biến này bằng `1` trong lúc build trên Cloudflare (có `WORKERS_CI` hoặc `CF_PAGES`), build sẽ báo lỗi và dừng.
- Máy dùng npm 11 còn Cloudflare dùng npm 10. Sau khi thêm hoặc đổi gói, chạy `npx -y npm@10.9.2 install --package-lock-only --ignore-scripts` trước khi push, nếu không `npm ci` trên Cloudflare sẽ báo lock lệch.

## Xóa tay một bản phát hành

Không có lệnh gỡ. Muốn gỡ một bản đã phát hành:

1. Vào trang GitHub của repo, mục Releases, mở Release `<id>-v<version>` và chọn Delete. Xóa luôn tag nếu GitHub hỏi.
2. Mở `src/data/releases/<id>.json`, xóa mục có `"version"` tương ứng, giữ JSON hợp lệ (danh sách rỗng là `[]`).
3. `git add`, `git commit`, `git push` để trang cập nhật.

## Sáu việc cần bạn làm trước khi đưa lên mạng

Những việc này không cản việc dựng và chạy trang trên máy. Việc nào cũng cần bạn đồng ý vào lúc làm.

1. Tạo tài khoản GitHub và repo công khai (đề xuất tên `zaldors-vault`), rồi điền `repo` trong `vault.config.ts`. Tạo repo và push cần bạn đồng ý.
2. Cài `gh` để lệnh `release` tải file lên được.
3. Bật Discussions trên repo và cài ứng dụng Giscus, rồi điền `giscus` trong `vault.config.ts` để có bình luận.
4. Nối repo với Cloudflare (Worker `zaldors-vault`, xem mục cài đặt Cloudflare); thêm tên miền riêng nếu muốn.
5. Thay chữ giữ chỗ bằng ảnh chụp màn hình, số tiến độ, câu giới thiệu và hướng dẫn cài cho từng game; viết đoạn giới thiệu thật ở `/gioi-thieu/`.
6. Xác nhận bản nào được phép công khai. Hiện chỉ LAD8 v0.9.0 và v0.9.1 qua được quy tắc chặn; Stellar Blade v0.1 đến v0.3 bị chặn. Chưa bản nào được đẩy lên khi chưa hỏi bạn.

Nút donate nằm sẵn ở `/gioi-thieu/` nhưng ẩn. Điền `donate: { label, url }` trong `vault.config.ts` để hiện.
