# Hướng dẫn dành cho AI Agents (Nexo Web Portal)

Tài liệu này chứa các quy tắc thiết kế, kiến trúc và quy định hành vi dành cho các AI Coding Agents khi làm việc trên dự án **Nexo Portal**. Các agent bắt buộc phải tuân thủ nghiêm ngặt các quy tắc này.

---

## 1. Giới thiệu Dự án & Công nghệ

- **Dự án**: Nexo Portal (Web client quản lý tài chính cá nhân, thu nhập và chi tiêu).
- **Công nghệ cốt lõi**: React (TypeScript), Vite, TailwindCSS, Moment.js.
- **Backend API**: Golang REST API (`nexo-app-api`) chạy tại cổng mặc định `http://localhost:3001/api/v1`.

---

## 2. Kiến trúc Thiết kế Dự án

### Cấu trúc thư mục

- `src/components/`: Chứa các view/components của hệ thống (Dashboard, Categories, Transactions).
- `src/services/api.ts`: Nơi chứa toàn bộ tầng giao tiếp HTTP API, định nghĩa các interfaces và endpoints như `transactionService`, `categoryService`, `authService`.
- `src/index.css` & `src/App.css`: Quản lý styles toàn cục và cấu hình giao diện.

### Quản lý Giao dịch & Danh mục

- Dự án sử dụng API `/transactions` cho cả **Thu nhập (INCOME)** và **Chi phí (EXPENSE)**. Không sử dụng API `/costs` cũ.
- Danh mục (`Category`) bắt buộc phải có thuộc tính `type: 'INCOME' | 'EXPENSE'` để đồng bộ hóa với hệ thống giao dịch của backend.

---

## 3. Quy tắc bắt buộc dành cho Agent (Rules for Agents)

### 🚫 Quy tắc về Git & Kiểm soát mã nguồn

1. **Không tự động commit code**: Agent KHÔNG ĐƯỢC tự động chạy lệnh `git commit` trừ khi có sự đồng ý hoặc yêu cầu cụ thể từ người dùng.
2. **Không tự động push code**: Agent KHÔNG ĐƯỢC tự động chạy lệnh `git push` lên bất kỳ nhánh nào trên remote repository.

### 🕒 Quy tắc xử lý Thời gian (Date & Time Handling)

- Tất cả các thao tác xử lý, định dạng, tính toán, và chuyển đổi múi giờ liên quan đến ngày tháng, thời gian phải sử dụng thư viện **`moment`** (Moment.js) thay vì sử dụng đối tượng `Date` thuần của JavaScript để tránh lỗi lệch múi giờ trên các môi trường.
- Ví dụ định dạng ngày gửi lên API hoặc hiển thị: `moment(date).format('YYYY-MM-DD')` hoặc `moment(date).toISOString()`.

### 🎨 Quy tắc về Styling & Giao diện

- Sử dụng **TailwindCSS** cho các phần styling mới hoặc chỉnh sửa giao diện. Hạn chế viết CSS thuần (Vanilla CSS) nếu có thể giải quyết bằng các class tiện ích của TailwindCSS.
- Đảm bảo giao diện có tính responsive tốt trên mọi thiết bị và áp dụng các hiệu ứng animation mượt mà.

### 🏷️ Quy tắc về Hằng số & Enum (Constants & Enums)

- Khai báo rõ ràng các `constant` hoặc `enum` cho các giá trị tĩnh hoặc các biến được sử dụng lặp đi lặp lại trong ứng dụng (ví dụ: các loại giao dịch `INCOME` / `EXPENSE`, các định dạng ngày tháng, v.v.). Tránh việc hardcode trực tiếp các chuỗi ký tự này trong logic xử lý code.

### 📂 Quy tắc về Tổ chức Import (Barrel Imports)

- Sử dụng file `index.ts` (mô hình Barrel Export) ở cấp thư mục (ví dụ: `src/commons/constants/index.ts`, `src/commons/utils/index.ts`) để gộp toàn bộ việc import/export các file con trong thư mục đó. Khi gọi import ở các component khác, hãy import trực tiếp từ đường dẫn thư mục cha để giữ code gọn gàng, sạch sẽ.
