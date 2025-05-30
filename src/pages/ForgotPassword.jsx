import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/ForgotPassword.css"; // Sử dụng file CSS chuyên biệt

export default function ForgotPassword() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [gmail, setGmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: nhập SĐT, 2: xác thực OTP, 3: thành công
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleGetGmail = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      // Bước 1: Lấy Gmail liên kết với số điện thoại
      const gmailRes = await axios.get(`http://13.211.212.72:3000/api/user/${phoneNumber}/gmail`);
      setGmail(gmailRes.data.gmail);
      
      // Che giấu một phần email để bảo mật
      const emailParts = gmailRes.data.gmail.split('@');
      const username = emailParts[0];
      const domain = emailParts[1];
      const maskedUsername = username.substring(0, 3) + '***' + username.substring(username.length - 2);
      const maskedEmail = `${maskedUsername}@${domain}`;
      
      setMessage(`Gmail liên kết: ${maskedEmail}`);
      
      // Bước 2: Gửi mã OTP đến Gmail đó
      await axios.post("http://13.211.212.72:3000/api/OTP/send", {
        gmail: gmailRes.data.gmail
      });
      
      setMessage(prev => `${prev}. Đã gửi mã OTP, vui lòng kiểm tra hộp thư của bạn (kiểm tra cả thư rác). Mã OTP có hiệu lực trong 5 phút.`);
      setStep(2);
      setCountdown(60); // Đếm ngược 60 giây trước khi cho phép gửi lại OTP
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Số điện thoại không tồn tại trong hệ thống");
      } else {
        setError("Có lỗi xảy ra, vui lòng thử lại sau");
        console.error("Lỗi:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      // Bước 3: Xác thực mã OTP
      await axios.post("http://13.211.212.72:3000/api/OTP/verify", {
        gmail,
        OTP: otp
      });
      
      // Bước 4: Đặt lại mật khẩu nếu OTP chính xác
      await axios.post(`http://13.211.212.72:3000/api/user/resetPassword/${phoneNumber}`);
      setMessage("Đặt lại mật khẩu thành công! Mật khẩu mới đã được gửi đến email của bạn.");
      setStep(3);
    } catch (err) {
      if (err.response?.status === 400) {
        setError("Mã OTP không chính xác");
      } else {
        setError("Có lỗi xảy ra, vui lòng thử lại sau");
        console.error("Lỗi:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setMessage("Đang gửi lại mã OTP...");
    setIsLoading(true);

    try {
      await axios.post("http://13.211.212.72:3000/api/OTP/send", {
        gmail
      });
      setMessage("Đã gửi lại mã OTP, vui lòng kiểm tra email của bạn.");
      setCountdown(60);
    } catch (err) {
      setError("Có lỗi xảy ra khi gửi lại mã OTP");
      console.error("Lỗi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    navigate("/");
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <div className="forgot-password-header">
          <h1>Zalo</h1>
          <p>Khôi phục mật khẩu Zalo</p>
        </div>
        
        {step === 1 && (
          <form onSubmit={handleGetGmail} className="forgot-password-form">
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
            <div className="form-group">
              <label htmlFor="phoneNumber">Số điện thoại</label>
              <input
                type="text"
                id="phoneNumber"
                placeholder="Nhập số điện thoại đã đăng ký"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="forgot-password-button" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Tiếp tục"}
            </button>
            <p className="forgot-password-link">
              <a href="/">Quay lại đăng nhập</a>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="forgot-password-form">
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
            <div className="form-group">
              <label htmlFor="otp">Mã xác thực OTP</label>
              <input
                type="text"
                id="otp"
                placeholder="Nhập mã OTP từ email"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="forgot-password-button" disabled={isLoading}>
              {isLoading ? "Đang xác thực..." : "Xác nhận"}
            </button>
            
            {countdown > 0 && (
              <p className="timer">Có thể gửi lại OTP sau {countdown} giây</p>
            )}
            
            <button 
              type="button" 
              className="resend-otp-button"
              onClick={handleResendOTP}
              disabled={isLoading || countdown > 0}
            >
              Gửi lại mã OTP
            </button>
            
            <p className="forgot-password-link">
              <a href="/">Quay lại đăng nhập</a>
            </p>
          </form>
        )}

        {step === 3 && (
          <div className="forgot-password-form">
            <p className="success-message">{message}</p>
            <button onClick={goToLogin} className="forgot-password-button">
              Đăng nhập với mật khẩu mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
}