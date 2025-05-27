import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import socket, { connectSocketWithToken } from "../socket";
import "../styles/Login.css";
import { v4 as uuidv4 } from "uuid";
import { QRCodeCanvas } from "qrcode.react";

const QRTab = ({ sessionID }) => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px",
        paddingTop:62,
        paddingBottom:65,
        backgroundColor: "#f9f9f9",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        marginTop: "20px",
      }}
    >
      <p style={{ fontSize: "16px", marginBottom: "15px", color: "#333" }}>
        Quét mã QR bằng app Zalo để đăng nhập
      </p>
      {sessionID && (
        <QRCodeCanvas
          value={sessionID}
          size={300}
          style={{ border: "8px solid #fff", borderRadius: "10px" }}
        />
      )}
    </div>
  );
};

export default function Login() {
  const [tab, setTab] = useState("password"); // "password" | "qr"
  const [sessionID, setSessionID] = useState("");
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
      // connectSocketWithToken();
      return res.data.accessToken;
    } catch (err) {
      console.error("Failed to refresh token:", err);
      throw err;
    }
  };

  const joinUserGroupRooms = async (userID, token) => {
    try {
      // Gọi API để lấy danh sách nhóm của người dùng
      const groupsRes = await axios.get(`http://localhost:3000/api/group/${userID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const groupList = groupsRes.data;
      
      // Tham gia tất cả các phòng nhóm bằng sự kiện 'joinGroupRoom'
      groupList.forEach((group) => {
        socket.emit("joinGroupRoom", group.groupID, (response) => {
          console.log(`Join groupRoom ${group.groupID} response: ${response}`);
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
      const res = await axios.post("http://localhost:3000/api/auth/login", {
        phoneNumber,
        password,
      });
      const { accessToken, refreshToken, user } = res.data;

      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      socket.emit("joinUserRoom", user.userID);
      await joinUserGroupRooms(user.userID, accessToken);
      navigate("/home");
    } catch (err) {
      if (err.response?.status === 401) {
        try {
          const newAccessToken = await refreshToken();
          if (newAccessToken) {
            const res = await axios.post("http://localhost:3000/api/auth/login", {
              phoneNumber,
              password,
            });

            const { accessToken, refreshToken, user } = res.data;

            localStorage.setItem("token", accessToken);
            localStorage.setItem("refreshToken", refreshToken);

            // connectSocketWithToken();
            socket.emit("joinUserRoom", user.userID);
            await joinUserGroupRooms(user.userID, accessToken);
            navigate("/home");
          } else {
            setError("Không thể làm mới phiên đăng nhập. Vui lòng thử lại.");
          }
        } catch {
          setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }
      } else {
        setError("Sai số điện thoại hoặc mật khẩu! Vui lòng thử lại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(()=>{
    connectSocketWithToken();
    const newID = uuidv4();
    setSessionID(newID);
    socket.emit("qr-session", { sessionID: newID });
    console.log("qrsession: ",newID);
    

    // Nhận user,tokens từ app
    socket.on("qr-authenticated", async({ accessToken, refreshToken, user }) => {
      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      socket.emit("joinUserRoom", user.userID);
      await joinUserGroupRooms(user.userID, accessToken);
      navigate("/home")
    });

    return () => {
      socket.off("qr-authenticated");
    };
  },[])

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Zalo</h1>
          <p>Đăng nhập để kết nối bạn bè và gia đình</p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "20px",
            marginTop:20
          }}
        >
          <button
            onClick={() => setTab("password")}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              backgroundColor: tab === "password" ? "#007bff" : "#e0e0e0",
              color: tab === "password" ? "#fff" : "#000",
              cursor: "pointer",
              fontWeight: tab === "password" ? "bold" : "normal",
            }}
          >
            Đăng nhập bằng mật khẩu
          </button>
          <button
            onClick={() => setTab("qr")}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              backgroundColor: tab === "qr" ? "#007bff" : "#e0e0e0",
              color: tab === "qr" ? "#fff" : "#000",
              cursor: "pointer",
              fontWeight: tab === "qr" ? "bold" : "normal",
            }}
          >
            Quét mã QR
          </button>
        </div>

        {tab === "password" ? (
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
              {isLoading ? <span className="loading-spinner">Đang đăng nhập...</span> : "Đăng nhập"}
            </button>
            <p className="login-link">
              Chưa có tài khoản? <a href="/register">Đăng ký ngay</a>
            </p>
            <p className="login-link">
              <a href="/forgot-password">Quên mật khẩu?</a>
            </p>
          </form>
        ) : (
          <QRTab sessionID={sessionID}/>
        )}
      </div>
    </div>
  );
}