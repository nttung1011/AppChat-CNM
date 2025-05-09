// src/socket.js
import { io } from "socket.io-client";

// Khởi tạo socket với cổng 3000
const socket = io("http://localhost:3000", {
    autoConnect: false,
    auth: {
        token: localStorage.getItem("token") || "",
    },
});

// Ghi log chi tiết các sự kiện kết nối
socket.on("connect", () => {
    console.log("Socket kết nối thành công");
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
});

export default socket;