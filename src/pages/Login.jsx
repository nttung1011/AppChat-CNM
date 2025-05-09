import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../socket";
import "../styles/Login.css";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token available");
      const res = await axios.post("http://localhost:3000/api/auth/refreshToken", {
        refreshToken,
      });
      localStorage.setItem("token", res.data.accessToken);
      socket.auth.token = res.data.accessToken;
      socket.connect();
      return res.data.accessToken;
    } catch (err) {
      console.error("Failed to refresh token:", err);
      throw err;
    }
  };

  const joinUserGroups = async (userID, token) => {
    try {
      // Gọi API để lấy danh sách nhóm của người dùng
      const groupsRes = await axios.get(`http://localhost:3000/api/group/${userID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const groupList = groupsRes.data;
      
      // Tham gia tất cả các phòng nhóm bằng sự kiện 'joinGroup'
      groupList.forEach((group) => {
        socket.emit("joinGroup", userID, group.groupID, (response) => {
          console.log(`Join group ${group.groupID} response: ${response}`);
        });
      });
    } catch (err) {
      console.error("Lỗi khi tham gia các phòng nhóm:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Đăng nhập
      const res = await axios.post("http://localhost:3000/api/auth/login", {
        phoneNumber,
        password,
      });
      const { accessToken, refreshToken, user } = res.data;
      
      // Lưu token
      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      
      // Cấu hình socket và kết nối
      socket.auth.token = accessToken;
      socket.connect();
      
      // Tham gia phòng cá nhân
      socket.emit("joinUserRoom", user.userID);
      
      // Tham gia tất cả các phòng nhóm
      await joinUserGroups(user.userID, accessToken);
      
      // Điều hướng đến trang chủ
      navigate("/home");
    } catch (err) {
      if (err.response?.status === 401) {
        try {
          const newAccessToken = await refreshToken();
          // Thử đăng nhập lại
          const res = await axios.post("http://localhost:3000/api/auth/login", {
            phoneNumber,
            password,
          });
          const { accessToken, refreshToken, user } = res.data;
          
          localStorage.setItem("token", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          socket.auth.token = accessToken;
          socket.connect();
          
          socket.emit("joinUserRoom", user.userID);
          await joinUserGroups(user.userID, accessToken);
          
          navigate("/home");
        } catch (refreshErr) {
          setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }
      } else {
        setError("Sai số điện thoại hoặc mật khẩu! Vui lòng thử lại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Zalo</h1>
          <p>Đăng nhập để kết nối bạn bè và gia đình</p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          {error && <p className="error-message">{error}</p>}
          <div className="form-group">
            <label htmlFor="phoneNumber">Số điện thoại</label>
            <input
              type="text"
              id="phoneNumber"
              placeholder="Nhập số điện thoại"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <span className="loading-spinner">Đang đăng nhập...</span>
            ) : (
              "Đăng nhập"
            )}
          </button>
          <p className="login-link">
            Chưa có tài khoản? <a href="/register">Đăng ký ngay</a>
          </p>
          <p className="login-link">
            <a href="/forgot-password">Quên mật khẩu?</a>
          </p>
        </form>
      </div>
    </div>
  );
}
