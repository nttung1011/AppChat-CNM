import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../styles/Profile.css";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Hàm định dạng ngày tháng thành dạng ngày/tháng/năm
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Chưa cập nhật";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0"); // Tháng bắt đầu từ 0
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "Chưa cập nhật";
    }
  };

  // Hàm chuyển định dạng ngày/tháng/năm sang yyyy-MM-dd để gửi lên server
  const parseDateForServer = (dateString) => {
    if (!dateString) return "";
    const [day, month, year] = dateString.split("/");
    if (!day || !month || !year) return dateString; // Trả về nguyên bản nếu không đúng định dạng
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

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
        setUser(res.data);
        setFormData({
          username: res.data.username || "",
          phoneNumber: res.data.phoneNumber || "",
          gmail: res.data.gmail || "",
          DOB: res.data.DOB || "", // Lưu nguyên dạng yyyy-MM-dd
        });
        setLoading(false);
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
              setUser(res.data);
              setFormData({
                username: res.data.username || "",
                phoneNumber: res.data.phoneNumber || "",
                gmail: res.data.gmail || "",
                DOB: res.data.DOB || "",
              });
              setLoading(false);
            } catch (retryErr) {
              console.error("Lỗi sau khi làm mới token:", retryErr);
              setError("Không thể tải thông tin cá nhân. Vui lòng đăng nhập lại.");
              setLoading(false);
            }
          }
        } else {
          console.error("Lỗi khi lấy thông tin người dùng:", err);
          setError("Không thể tải thông tin cá nhân. Vui lòng thử lại sau.");
          setLoading(false);
        }
      }
    };

    fetchUser();
  }, [navigate, refreshAccessToken]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: id === "DOB" ? value : value }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const decodedToken = jwtDecode(token);
      const userID = decodedToken.userID;
  
      // Sử dụng parseDateForServer để định dạng DOB
      const dataToSend = {
        ...formData,
        DOB: parseDateForServer(formData.DOB) || "",
      };
  
      const res = await axios.put(
        `http://localhost:3000/api/user/${userID}`,
        dataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      setUser(res.data.user);
      setIsEditing(false);
    } catch (err) {
      console.error("Lỗi khi cập nhật thông tin:", err);
      setError("Không thể cập nhật thông tin. Vui lòng thử lại.");
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user.username || "",
      phoneNumber: user.phoneNumber || "",
      gmail: user.gmail || "",
      DOB: user.DOB || "",
    });
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validImageTypes.includes(file.type)) {
      setAvatarError("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF)");
      return;
    }
  
    if (file.size > 50 * 1024 * 1024) {
      setAvatarError("Kích thước ảnh không được vượt quá 50MB");
      return;
    }
  
    setAvatarError("");
    setAvatarSuccess("");
    setUploadingAvatar(true);
  
    const maxRetries = 2;
    let attempt = 0;
  
    while (attempt <= maxRetries) {
      try {
        let token = localStorage.getItem("token");
        const decodedToken = jwtDecode(token);
        const userID = decodedToken.userID;
  
        const formData = new FormData();
        formData.append("avatar", file);
  
        const res = await axios.put(
          `http://localhost:3000/api/user/${userID}/avatar`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
  
        setUser((prev) => ({
          ...prev,
          avatar: res.data.user.avatar,
        }));
  
        setAvatarSuccess("Cập nhật ảnh đại diện thành công!");
        setTimeout(() => setAvatarSuccess(""), 3000);
        break;
      } catch (err) {
        if (err.response?.status === 401 && attempt < maxRetries) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            localStorage.setItem("token", newToken);
            attempt++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          } else {
            setAvatarError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            break;
          }
        } else {
          console.error("Lỗi khi cập nhật avatar:", err);
          let errorMessage = "Không thể cập nhật ảnh đại diện. Vui lòng thử lại sau.";
          if (err.response?.status === 500) {
            const backendError = err.response?.data || err.message;
            if (
              typeof backendError.message === "string" &&
              (backendError.message.toLowerCase().includes("dynamodb") ||
                backendError.message.toLowerCase().includes("database"))
            ) {
              errorMessage = "Lỗi cơ sở dữ liệu, vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
            } else if (
              typeof backendError.message === "string" &&
              (backendError.message.toLowerCase().includes("s3") ||
                backendError.message.toLowerCase().includes("bucket"))
            ) {
              errorMessage = "Lỗi lưu trữ file, vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
            } else {
              errorMessage =
                "Lỗi server không xác định, vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
            }
          } else if (err.response?.status === 400) {
            errorMessage = err.response?.data?.message || "File không hợp lệ.";
          } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
          }
          setAvatarError(errorMessage);
          break;
        }
      // eslint-disable-next-line no-unreachable
      } finally {
        setUploadingAvatar(false); // Chuyển vào đây và xóa điều kiện
      }
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <p>Đang tải thông tin...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <p className="error-message">{error}</p>
        <button className="back-button" onClick={() => navigate("/home")}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h1>Thông tin cá nhân</h1>
      <div className="profile-content">
        <div className="profile-avatar">
          <div className="avatar-container" onClick={handleAvatarClick}>
            <img
              src={user.avatar !== "NONE" ? user.avatar : "https://via.placeholder.com/150"}
              alt="Avatar"
              className={uploadingAvatar ? "uploading" : ""}
            />
            <div className="avatar-overlay">
              <i className="fas fa-camera"></i>
              <span>Đổi ảnh</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/png,image/gif"
              style={{ display: "none" }}
            />
          </div>
          {avatarError && <p className="error-message">{avatarError}</p>}
          {avatarSuccess && <p className="success-message">{avatarSuccess}</p>}
        </div>
        <div className="profile-form">
          <div className="form-group">
            <label htmlFor="username">Tên</label>
            <input
              type="text"
              id="username"
              value={formData.username || ""}
              onChange={handleInputChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="form-group">
            <label htmlFor="phoneNumber">Số điện thoại</label>
            <input
              type="text"
              id="phoneNumber"
              value={formData.phoneNumber || ""}
              onChange={handleInputChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="form-group">
            <label htmlFor="gmail">Email</label>
            <input
              type="email"
              id="gmail"
              value={formData.gmail || ""}
              onChange={handleInputChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="form-group">
            <label htmlFor="DOB">Ngày sinh</label>
            {isEditing ? (
              <input
                type="date"
                id="DOB"
                value={formData.DOB || ""}
                onChange={handleInputChange}
              />
            ) : (
              <input
                type="text"
                id="DOB"
                value={formatDate(formData.DOB)}
                readOnly
              />
            )}
          </div>
        </div>
      </div>
      <div className="button-group">
        {isEditing ? (
          <>
            <button className="save-button" onClick={handleSave}>
              Lưu
            </button>
            <button className="cancel-button" onClick={handleCancel}>
              Hủy
            </button>
          </>
        ) : (
          <button className="edit-button" onClick={() => setIsEditing(true)}>
            Chỉnh sửa
          </button>
        )}
        <button className="back-button" onClick={() => navigate("/home")}>
          Quay lại
        </button>
      </div>
    </div>
  );
}