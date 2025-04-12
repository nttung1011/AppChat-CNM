import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Register.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [DOB, setDob] = useState("");
  const [gmail, setGmail] = useState(""); // Thêm state cho gmail
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Kiểm tra số điện thoại
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError("Số điện thoại phải là 10 chữ số.");
      setIsLoading(false);
      return;
    }

    // Kiểm tra mật khẩu
    if (password.length < 6) {
      setError("Mật khẩu phải dài ít nhất 6 ký tự.");
      setIsLoading(false);
      return;
    }

    // Kiểm tra ngày sinh
    const dobDate = new Date(DOB);
    const today = new Date();
    if (dobDate > today) {
      setError("Ngày sinh không thể là ngày trong tương lai.");
      setIsLoading(false);
      return;
    }

    // Kiểm tra email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(gmail)) {
      setError("Vui lòng nhập email hợp lệ.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("http://localhost:3000/api/user/", {
        username,
        phoneNumber,
        password,
        DOB,
        gmail, // Thêm gmail vào request body
      });
      console.log("Phản hồi từ backend:", response.data);

      // Sau khi đăng ký thành công, gọi endpoint đăng nhập để lấy token
      const loginResponse = await axios.post("http://localhost:3000/api/auth/login", {
        phoneNumber,
        password,
      });
      console.log("Phản hồi từ đăng nhập:", loginResponse.data);
      localStorage.setItem("token", loginResponse.data.accessToken);
      navigate("/");
    } catch (err) {
      console.error("Lỗi chi tiết:", err);
      console.error("Phản hồi từ server:", err.response);
      setError(
        err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          {/* <img
            src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Zalo_Logo.png"
            alt="Zalo Logo"
            className="register-logo"
          /> */}
          <h1>Zalo</h1>
          <p>Đăng ký tài khoản Zalo để kết nối với ứng dụng</p>
        </div>
        <form onSubmit={handleRegister} className="register-form">
          {error && <p className="error-message">{error}</p>}
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              type="text"
              id="username"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
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
            <label htmlFor="gmail">Email</label>
            <input
              type="email"
              id="gmail"
              placeholder="Nhập email"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
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
          <div className="form-group">
            <label htmlFor="dob">Ngày sinh</label>
            <input
              type="date"
              id="dob"
              value={DOB}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="register-button" disabled={isLoading}>
            {isLoading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
          <p className="register-link">
            Đã có tài khoản? <a href="/">Đăng nhập</a>
          </p>
        </form>
      </div>
    </div>
  );
}