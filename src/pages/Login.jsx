import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Login.css";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await axios.post("http://localhost:3000/api/auth/login", {
        phoneNumber,
        password,
      });
      localStorage.setItem("token", res.data.accessToken);
      navigate("/home");
    } catch (err) {
      setError("Sai số điện thoại hoặc mật khẩu! Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          {/* <img
            src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Zalo_Logo.png"
            alt="Zalo Logo"
            className="login-logo"
          /> */}
          <h1>Zalo</h1>
          <p>Đăng nhập tài khoản Zalo để kết nối với ứng dụng</p>
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