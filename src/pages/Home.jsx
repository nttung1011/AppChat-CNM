import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../styles/Home.css";

export default function Home() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatList] = useState([
    { id: 1, name: "Nguyễn Thanh Tùng", lastMessage: "Okay", active: true },
    { id: 2, name: "Nhóm abc", lastMessage: "Bạn A: 123", isGroup: true },
  ]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const navigate = useNavigate();

  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("Không có refresh token");

      const res = await axios.post("http://localhost:3000/api/auth/refreshToken", {
        refreshToken,
      });
      const newAccessToken = res.data.accessToken;
      localStorage.setItem("token", newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error("Lỗi khi làm mới token:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      navigate("/");
      return null;
    }
  }, [navigate]);

  useEffect(() => {
    const fetchUser = async () => {
      let token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const userID = decodedToken.userID;

        const res = await axios.get(`http://localhost:3000/api/user/${userID}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("User data:", res.data); // Log để kiểm tra avatar
        setUser(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          token = await refreshAccessToken();
          if (token) {
            try {
              const decodedToken = jwtDecode(token);
              const userID = decodedToken.userID;
              const res = await axios.get(`http://localhost:3000/api/user/${userID}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              console.log("User data after refresh:", res.data); // Log để kiểm tra
              setUser(res.data);
            } catch (retryErr) {
              console.error("Lỗi sau khi làm mới token:", retryErr);
              localStorage.removeItem("token");
              localStorage.removeItem("refreshToken");
              navigate("/");
            }
          }
        } else {
          console.error("Lỗi khi lấy thông tin user:", err);
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          navigate("/");
        }
      }
    };

    fetchUser();
  }, [navigate, refreshAccessToken]);

  const handleLogout = () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      axios.post("http://localhost:3000/api/auth/logout", { refreshToken });
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    navigate("/");
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleChangePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
  
    const { oldPassword, newPassword, confirmPassword } = passwordData;
  
    // Kiểm tra đầu vào
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Vui lòng điền đầy đủ các trường!");
      return;
    }
  
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }
  
    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      if (!user || !user.phoneNumber) {
        setPasswordError("Không thể xác định thông tin người dùng!");
        return;
      }
  
      // Gửi cả oldPassword và newPassword đến API
      const response = await axios.put(
        `http://localhost:3000/api/user/changePassword/${user.phoneNumber}`,
        { oldPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      setPasswordSuccess(response.data.message);
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setPasswordSuccess("");
      }, 2000);
    } catch (err) {
      console.error("Lỗi khi đổi mật khẩu:", err);
      setPasswordError(err.response?.data?.message || "Đổi mật khẩu thất bại. Vui lòng thử lại!");
    }
  }

  const closeModal = () => {
    setShowChangePasswordModal(false);
    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordError("");
    setPasswordSuccess("");
  };

  // Hàm xác định URL avatar
  const getAvatarUrl = () => {
    if (user && user.avatar && user.avatar !== "NONE") {
      return user.avatar;
    }
    return ""; // Ảnh mặc định
  };

  return (
    <div className="home-container">
      <div className="left-sidebar">
        <div className="user-avatar-wrapper">
          <div className="user-avatar" onClick={toggleDropdown}>
            <img src={getAvatarUrl()} alt="User" />
          </div>
          {showDropdown && (
            <div className="user-dropdown">
              <div className="dropdown-username">
                {user ? user.username : "Người dùng"}
              </div>
              <hr className="dropdown-divider" />
              <div className="dropdown-item" onClick={() => navigate("/profile")}>
                <i className="fas fa-user-circle"></i>
                Thông tin cá nhân
              </div>
              <div
                className="dropdown-item"
                onClick={() => setShowChangePasswordModal(true)}
              >
                <i className="fas fa-lock"></i>
                Đổi mật khẩu
              </div>
              <div className="dropdown-item" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
                Đăng xuất
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-icons">
          <div className="sidebar-icon active">
            <i className="fas fa-comment"></i>
          </div>
          <div className="sidebar-icon">
            <i className="fas fa-address-book"></i>
          </div>
          <div className="sidebar-icon">
            <i className="fas fa-book"></i>
          </div>
          <div className="sidebar-icon">
            <i className="fas fa-cloud"></i>
          </div>
          <div className="sidebar-icon">
            <i className="fas fa-cog"></i>
          </div>
        </div>
      </div>

      <div className="chat-list-container">
        <div className="chat-list-header">
          <div className="search-bar">
            <input type="text" placeholder="Tìm kiếm" />
          </div>
          <div className="view-options">
            <button className="view-button">
              <i className="fas fa-th-large"></i>
            </button>
            <button className="view-button active">
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>

        <div className="chat-tabs">
          <div className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            Tất cả
          </div>
          <div className={`tab ${activeTab === 'unread' ? 'active' : ''}`} onClick={() => setActiveTab('unread')}>
            Chưa đọc
          </div>
          <div className="tab-options">
            <i className="fas fa-ellipsis-h"></i>
          </div>
        </div>

        <div className="chat-list">
          {chatList.map((chat) => (
            <div key={chat.id} className={`chat-item ${chat.active ? "active" : ""}`}>
              <div className="chat-avatar">
                {chat.isGroup ? (
                  <div className="group-avatar">
                    <img src="" alt="Group" />
                  </div>
                ) : (
                  <img src="" alt={chat.name} />
                )}
              </div>
              <div className="chat-info">
                <div className="chat-name">{chat.name}</div>
                <div className="chat-last-message">{chat.lastMessage}</div>
              </div>
              <div className="chat-time">{chat.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-content empty"></div>

      {showChangePasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Đổi mật khẩu</h2>
              <button className="modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form className="modal-form" onSubmit={handleChangePassword}>
              <div className="form-group">
                <label htmlFor="oldPassword">Nhập mật khẩu</label>
                <input
                  type="password"
                  id="oldPassword"
                  name="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={handleChangePasswordInput}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">Mật khẩu mới</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handleChangePasswordInput}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handleChangePasswordInput}
                  required
                />
              </div>
              {passwordError && <p className="error-message">{passwordError}</p>}
              {passwordSuccess && <p className="success-message">{passwordSuccess}</p>}
              <div className="modal-buttons">
                <button type="submit" className="save-button">
                  Lưu
                </button>
                <button type="button" className="cancel-button" onClick={closeModal}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}