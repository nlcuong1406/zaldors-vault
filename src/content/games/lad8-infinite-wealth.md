---
id: "lad8-infinite-wealth"
title: "Like a Dragon: Infinite Wealth"
platform: "PC (Steam, Windows)"
edition: "Steam"
status: dang-dich
progress: 90
tagline: "Bản Việt hóa của người hâm mộ cho bản Steam trên Windows: giao diện, cốt truyện chính và nội dung phụ."
credits:
  - name: "Zaldor (Vergilize)"
    role: "Thực hiện, duyệt từng câu"
---

## Giới thiệu

Đây là bản Việt hóa không chính thức của người hâm mộ, không liên quan tới SEGA hay Ryu Ga Gotoku Studio. Gói không chứa game: bạn cần có bản game hợp lệ đã cài sẵn.

Bản dịch và công cụ do AI soạn, Vergilize duyệt từng câu.

Bản hiện tại đã dịch giao diện, cốt truyện chính (chương 0 đến 14), nội dung phụ và các ảnh giao diện chính. Xem chi tiết từng bản ở mục nhật ký thay đổi.

### Giới hạn đã biết

- Ảnh giao diện có chữ Việt chưa được soát hết trong game, có thể có chữ bị cắt hoặc lệch.
- Phụ đề tiếng Việt chỉ hiện khi chọn lồng tiếng Nhật. Chọn lồng tiếng Anh thì phụ đề vẫn là tiếng Anh.
- Chưa dịch: ảnh có chữ ngoài các màn chính (minigame, hướng dẫn, banner tên chiêu), tên đường trên bản đồ, lời karaoke, chữ trong video.
- Tiếng Việt thay vào ô ngôn ngữ Italiano.
- Steam Deck và Linux: chưa thử.

## Hướng dẫn cài đặt

### Điều kiện

- Windows 10 hoặc 11.
- Game bản Steam, đúng build ghi ở khối tải phía trên. Bộ cài từ chối mọi build khác.
- Ổ chứa game còn trống khoảng 1 GB cho bản sao lưu và file tạm.
- Không cần cài thêm chương trình nào, không cần mạng.

### Cài

1. Thoát game hẳn.
2. Tải gói, kiểm tra mã SHA-256 (xem trang [Hướng dẫn](/huong-dan/)).
3. Giải nén cả thư mục gói ra một chỗ bất kỳ, giữ nguyên cấu trúc thư mục.
4. Nhấp đúp `CAI-DAT.bat`. Bộ cài tự tìm thư mục game trong thư viện Steam và hỏi bạn xác nhận. Nếu không tìm thấy, dán đường dẫn tới thư mục `...\steamapps\common\LikeADragon8\runtime\media\data`.
5. Trong game, vào phần ngôn ngữ chữ và chọn ô Italiano, lúc này hiện là "Tiếng Việt".

Bộ cài kiểm mã băm của gói và của từng file game trước khi ghi, sao lưu file gốc vào thư mục `_lad8vh-backup`, và tự lùi lại nếu lỗi giữa chừng.

### Cập nhật

Chạy `CAI-DAT.bat` của gói mới. Không cần gỡ bản cũ trước.

### Gỡ

- Nhấp đúp `GO-CAI-DAT.bat` để trả file game về bản gốc.
- Hoặc trong Steam: chuột phải vào game, chọn Properties, Installed Files, Verify integrity of game files.

### Khi Steam cập nhật game

Steam sẽ trả file về bản gốc và bản Việt hóa mất. Nếu game lên build mới, bộ cài sẽ từ chối: hãy chờ gói mới.

### Nếu Windows chặn

- SmartScreen cảnh báo file tải về: chọn More info, rồi Run anyway nếu bạn tin nguồn gói.
- Game nằm trong thư mục không cho ghi: chuột phải `CAI-DAT.bat` và chọn Run as administrator.
- Máy cơ quan bắt buộc script phải ký số có thể không chạy được bộ cài.
