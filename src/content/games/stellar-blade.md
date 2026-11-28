---
id: "stellar-blade"
title: "Stellar Blade"
platform: "PC (Steam, Windows x64)"
edition: "Steam, bản 1.5.0"
status: dang-dich
progress: 90
tagline: "Bản Việt hóa của người hâm mộ cho bản Steam: toàn bộ văn bản trong game, kể cả DLC NIKKE và NieR."
cover: "../../assets/games/stellar-blade/cover.jpg"
credits:
  - name: "Zaldor (Vergilize)"
    role: "Dịch, duyệt từng câu"
---

## Giới thiệu

Đây là bản Việt hóa không chính thức của người hâm mộ, không liên quan tới nhà phát triển hay nhà phát hành. Gói không chứa tệp nào của game: file pak chỉ có các dòng tiếng Việt đã duyệt và font mã nguồn mở. Bạn cần bản game của chính mình.

Bản dịch có sự trợ giúp của AI, mọi câu chữ đã được người dịch duyệt.

Phạm vi: toàn bộ văn bản trong game gồm giao diện, hệ thống, vật phẩm, thoại, nhiệm vụ, nhật ký, hồ sơ, bộ sưu tập và DLC (NIKKE, NieR). Menu debug của nhà phát triển không được dịch.

### Giới hạn đã biết

- Đã kiểm tra tĩnh và thử cài, gỡ trên thư mục riêng. Chưa chơi thử toàn bộ trong game.
- Bản dịch thay cho tiếng Anh: ngôn ngữ game phải để English.
- Chỉ dành cho bản Steam build 26123051 (phiên bản 1.5.0). Các build khác chưa kiểm tra, bộ cài sẽ từ chối cài.
- Steam Deck: không hỗ trợ.

## Hướng dẫn cài đặt

### Cài bằng bộ cài

1. Tắt game.
2. Tải gói, kiểm tra mã SHA-256 (xem trang [Hướng dẫn](/huong-dan/)), rồi giải nén ra một thư mục.
3. Chạy `Kiem-tra.bat`: kiểm tra gói, bản game và thư mục `~mods`, không ghi gì.
4. Chạy `Cai-dat.bat` để cài bản dịch.
5. Trong game, để ngôn ngữ là English.

Các file `.bat` chạy `VH-Setup.ps1` bằng PowerShell với `-ExecutionPolicy Bypass` chỉ cho lần chạy đó, không đổi cài đặt của máy.

### Cài thủ công

1. Tắt game. Mở thư mục `<thư mục game>\SB\Content\Paks\` (trong Steam: chuột phải Stellar Blade, chọn Manage, Browse local files).
2. Tạo thư mục `~mods` nếu chưa có.
3. Xóa các bản cũ nếu có: `~mods\VH_v03_P.pak`, `~mods\VH_v02_P.pak`, `~mods\VH_v01_P.pak`.
4. Chép `VH_v03pub_P.pak` vào `~mods`.
5. Không để cùng lúc một bản Việt hóa khác trong `~mods`.

### Gỡ

Tắt game, chạy `Go-bo.bat`, hoặc xóa `~mods\VH_v03pub_P.pak`. Game trở về tiếng Anh gốc, không tệp gốc nào bị sửa.

### Khi Steam cập nhật game

Gỡ bản dịch cho tới khi có bản dựng lại cho build mới.
