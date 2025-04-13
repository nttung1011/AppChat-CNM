import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // Import axios để gọi API
import "../styles/Login.css";

export default function Login() {
  // Khởi tạo các state để lưu dữ liệu và trạng thái của form
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Hàm xử lý khi người dùng nhấn nút đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Gửi yêu cầu POST đến API đăng nhập với số điện thoại và mật khẩu
      const res = await axios.post("http://localhost:3000/api/auth/login", {
        phoneNumber,
        password,
      });
      // Lưu token nhận được từ server vào localStorage để sử dụng cho các yêu cầu sau
      localStorage.setItem("token", res.data.accessToken);
      navigate("/home");
    } catch (err) {
      setError("Sai số điện thoại hoặc mật khẩu! Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Container chính của giao diện đăng nhập
    <div className="login-container">
      
      <div className="login-box">
        
        <div className="login-header">
          <h1>Zalo</h1>
          <p>Đăng nhập tài khoản Zalo để kết nối với ứng dụng</p>
        </div>
        {/* Form đăng nhập */}
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

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"} 
          </button>
          <p className="login-link">
            Chưa có tài khoản? <a href="/register">Đăng ký</a>
          </p>
          <p className="login-link">
            <a href="/forgot-password">Quên mật khẩu?</a>
          </p>
        </form>
      </div>
    </div>
  );
}