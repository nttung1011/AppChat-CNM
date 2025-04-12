import { io } from "socket.io-client";

const token = localStorage.getItem("token");

const socket = io("http://localhost:5000", {
    auth: {
        token, // Gửi token kèm theo khi kết nối
    },
    transports: ["websocket"], // ưu tiên websocket
    autoConnect: false, // tự connect khi bạn gọi socket.connect()
});

export default socket;