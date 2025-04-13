import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Register.css";

export default function Register() {
  // Khởi tạo các state để lưu thông tin người dùng nhập
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [DOB, setDob] = useState("");
  const [gmail, setGmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("register"); // register | otp
  const navigate = useNavigate();

  const handleRequestOTP = async (e) => {
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
      // Gửi yêu cầu OTP
      const otpResponse = await axios.post("http://localhost:3000/api/OTP/send", {
        gmail,
      });
      console.log("Phản hồi OTP:", otpResponse.data);
      setStep("otp");
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTPAndRegister = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Xác thực OTP
      const verifyResponse = await axios.post("http://localhost:3000/api/OTP/verify", {
        gmail,
        OTP: otp,
      });
      console.log("Phản hồi xác thực OTP:", verifyResponse.data);

      // Nếu OTP đúng, tiến hành đăng ký
      if (verifyResponse.data.message === "OTP đúng") {
        const registerResponse = await axios.post("http://localhost:3000/api/user/", {
          username,
          phoneNumber,
          password,
          DOB,
          gmail,
        });
        console.log("Phản hồi từ đăng ký:", registerResponse.data);

        // Đăng nhập tự động sau khi đăng ký thành công
        const loginResponse = await axios.post("http://localhost:3000/api/auth/login", {
          phoneNumber,
          password,
        });
        console.log("Phản hồi từ đăng nhập:", loginResponse.data);
        localStorage.setItem("token", loginResponse.data.accessToken);
        navigate("/");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.response?.data || "Xác thực OTP hoặc đăng ký thất bại. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          <h1>Zalo</h1>
          <p>Đăng ký tài khoản Zalo để kết nối với ứng dụng</p>
        </div>

        {step === "register" ? (
          <form onSubmit={handleRequestOTP} className="register-form">
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
              <label htmlFor="username">Tên người dùng</label>
              <input
                type="text"
                id="username"
                placeholder="Nhập tên hiển thị"
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
              {isLoading ? "Đang xử lý..." : "Gửi OTP"}
            </button>
            <p className="register-link">
              Đã có tài khoản? <a href="/">Đăng nhập</a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTPAndRegister} className="register-form">
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
              <label htmlFor="otp">Mã OTP</label>
              <input
                type="text"
                id="otp"
                placeholder="Nhập mã OTP từ email"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="register-button" disabled={isLoading}>
              {isLoading ? "Đang xác thực..." : "Xác thực OTP"}
            </button>
            <p className="register-link">
              <button
                type="button"
                onClick={() => setStep("register")}
                className="back-button"
              >
                Quay lại
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}