import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../styles/Home.css";

// Component chính cho trang chủ của ứng dụng chat
export default function Home() {
  // Khởi tạo các state để quản lý dữ liệu
  const [user, setUser] = useState(null);
  // const [messages, setMessages] = useState([]);
  // const [newMessage, setNewMessage] = useState(""); 
  const [chatList] = useState([
    { id: 1, name: "Trần Bảo Xuyên", lastMessage: "Okay", active: true },
    { id: 2, name: "Nhóm abc", lastMessage: "Bạn A: 123", isGroup: true },
  ]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    // Dữ liệu nhập cho đổi mật khẩu
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

      // Gửi yêu cầu làm mới token
      const res = await axios.post("http://localhost:3000/api/auth/refreshToken", {
        refreshToken,
      });
      const newAccessToken = res.data.accessToken;
      localStorage.setItem("token", newAccessToken); // Lưu token mới
      return newAccessToken;
    } catch (error) {
      console.error("Lỗi khi làm mới token:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      return null;
    }
  }, []);

  // Effect để lấy thông tin người dùng khi component được mount
  useEffect(() => {
    const fetchUser = async () => {
      let token = localStorage.getItem("token");
      if (!token) {
        navigate("/"); // Nếu không có token, chuyển về trang đăng nhập
        return;
      }

      try {
        const decodedToken = jwtDecode(token); // Giải mã token để lấy userID
        const userID = decodedToken.userID;

        // Gửi yêu cầu lấy thông tin người dùng
        const res = await axios.get(`http://localhost:3000/api/user/${userID}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("User data:", res.data);
        setUser(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          // Nếu token hết hạn, thử làm mới
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
              console.log("User data after refresh:", res.data); // In dữ liệu để debug
              setUser(res.data); // Cập nhật state người dùng
            } catch (retryErr) {
              console.error("Lỗi sau khi làm mới token:", retryErr);
              localStorage.removeItem("token");
              localStorage.removeItem("refreshToken");
              navigate("/"); // Chuyển về trang đăng nhập
            }
          }
        } else {
          console.error("Lỗi khi lấy thông tin user:", err);
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          navigate("/"); // Chuyển về trang đăng nhập
        }
      }
    };

    fetchUser(); // Gọi hàm lấy thông tin người dùng
  }, [navigate, refreshAccessToken]);

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      axios.post("http://localhost:3000/api/auth/logout", { refreshToken }); // Gửi yêu cầu đăng xuất
    }
    localStorage.removeItem("token"); 
    localStorage.removeItem("refreshToken"); 
    navigate("/"); 
  };

 
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Hàm xử lý thay đổi giá trị input trong form đổi mật khẩu
  const handleChangePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value })); // Cập nhật state
  };

  // Hàm xử lý sự kiện đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
  
    const { oldPassword, newPassword, confirmPassword } = passwordData;
  
    // Kiểm tra các trường nhập liệu
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
      let token = localStorage.getItem("token");
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          setPasswordError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
          handleLogout();
          return;
        }
      }
  
      if (!user || !user.phoneNumber) {
        setPasswordError("Không thể xác định thông tin người dùng!");
        return;
      }
  
      // Gửi cả oldPassword và newPassword
      await axios.put(
        `http://localhost:3000/api/user/changePassword/${user.phoneNumber}`,
        { oldPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      setPasswordSuccess("Đổi mật khẩu thành công!");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setPasswordSuccess("");
      }, 2000);
    } catch (err) {
      console.error("Lỗi khi đổi mật khẩu:", err.response?.data, err.response?.status);
      if (err.response?.status === 401) {
        setPasswordError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
        handleLogout();
      } else if (err.response?.status === 400) {
        setPasswordError(err.response?.data?.message || "Mật khẩu cũ không đúng!");
      } else if (err.response?.status === 404) {
        setPasswordError("Không tìm thấy số điện thoại!");
      } else {
        setPasswordError(err.response?.data?.message || "Lỗi server. Vui lòng thử lại sau!");
      }
    }
  };

  // Hàm đóng modal đổi mật khẩu
  const closeModal = () => {
    setShowChangePasswordModal(false);
    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" }); // Xóa dữ liệu form
    setPasswordError("");
    setPasswordSuccess("");
  };

  // Hàm lấy URL ảnh đại diện người dùng
  const getAvatarUrl = () => {
    if (user && user.avatar && user.avatar !== "NONE") {
      return user.avatar; // Trả về ảnh đại diện nếu có
    }
    return "https://via.placeholder.com/40"; // Ảnh mặc định nếu không có
  };

  // Giao diện trang chủ
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

        {/* Các biểu tượng sidebar */}
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

      {/* Danh sách hội thoại */}
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

        {/* Tabs lọc hội thoại */}
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

        {/* Danh sách các cuộc hội thoại */}
        <div className="chat-list">
          {chatList.map((chat) => (
            <div key={chat.id} className={`chat-item ${chat.active ? "active" : ""}`}>
              <div className="chat-avatar">
                {chat.isGroup ? (
                  <div className="group-avatar">
                    <img src="https://via.placeholder.com/40" alt="Group" /> 
                  </div>
                ) : (
                  <img src="https://via.placeholder.com/40" alt={chat.name} />
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
      {/* Modal đổi mật khẩu */}
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
                <label htmlFor="oldPassword">Mật khẩu cũ</label>
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