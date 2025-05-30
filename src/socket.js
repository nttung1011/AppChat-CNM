// src/socket.js
import { io } from "socket.io-client";

// Khởi tạo socket, KHÔNG truyền token ngay lập tức
const socket = io("http://13.211.212.72:3000", {
    autoConnect: false,
});

// Đăng ký log sự kiện
socket.on("connect", () => {
    console.log("✅ Socket kết nối thành công");
});

socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);
});

socket.on("disconnect", (reason) => {
    console.log("⚠️ Socket disconnected:", reason);
});

// gọi socket.connect với token mới nhất
export const connectSocketWithToken = () => {
    const token = localStorage.getItem("token");
    socket.auth = { token };
    socket.connect();
};

export default socket;
