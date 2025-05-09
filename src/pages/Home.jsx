import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import ChatBox from "../pages/ChatBox";
import GroupChatBox from "../pages/GroupChatBox";
import socket from "../socket";
import "../styles/Home.css";

export default function Home() {
  const [user, setUser] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [selectedContactToDelete, setSelectedContactToDelete] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
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
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      navigate("/");
      return null;
    }
  }, [navigate]);

  const fetchChats = useCallback(async (token, userID) => {
  try {
    const chatsRes = await axios.get(`http://localhost:3000/api/message/${userID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (Array.isArray(chatsRes.data)) {
      const sortedChats = chatsRes.data.sort((a, b) => {
        // Kiểm tra tin nhắn chưa xem
        const hasUnreadA = a.messages.some(
          (msg) => msg.senderID !== userID && !msg.seenStatus.includes(userID)
        );
        const hasUnreadB = b.messages.some(
          (msg) => msg.senderID !== userID && !msg.seenStatus.includes(userID)
        );

        // Ưu tiên cuộc trò chuyện có tin nhắn chưa xem
        if (hasUnreadA && !hasUnreadB) return -1;
        if (!hasUnreadA && hasUnreadB) return 1;

        // Nếu không có sự khác biệt về trạng thái chưa xem, sắp xếp theo thời gian
        const lastMessageA = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
        const lastMessageB = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
        return lastMessageB - lastMessageA;
      });
      setChatList(sortedChats);
    } else {
      setChatList([]);
    }
  } catch (err) {
    console.error("Error fetching chats:", err.response?.data || err.message);
    setChatList([]);
  }
}, []);

  const fetchGroups = useCallback(async (token, userID) => {
    try {
      const groupsRes = await axios.get(`http://localhost:3000/api/group/${userID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const groupDetails = await Promise.all(
        groupsRes.data.map(async (member) => {
          const groupRes = await axios.get(`http://localhost:3000/api/group/${member.groupID}/info`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const membersRes = await axios.get(`http://localhost:3000/api/group/${member.groupID}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const messagesRes = await axios.get(`http://localhost:3000/api/message/group/${member.groupID}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return {
            group: groupRes.data.data,
            members: membersRes.data.data,
            messages: messagesRes.data,
          };
        })
      );
      const sortedGroups = groupDetails.sort((a, b) => {
        const lastMessageA = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
        const lastMessageB = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
        return lastMessageB - lastMessageA;
      });
      setGroupList(sortedGroups);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setGroupList([]);
    }
  }, []);

  useEffect(() => {
    const fetchUserAndData = async () => {
      let token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }
      try {
        const decodedToken = jwtDecode(token);
        const userID = decodedToken.userID;
        const userRes = await axios.get(`http://localhost:3000/api/user/${userID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userRes.data);

        await fetchChats(token, userID);
        await fetchGroups(token, userID);

        const contactsRes = await axios.get(`http://localhost:3000/api/user/${userID}/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contactsData = await Promise.all(
          contactsRes.data.map(async (contact) => {
            const contactRes = await axios.get(`http://localhost:3000/api/user/${contact.userID}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return contactRes.data;
          })
        );
        setContacts(contactsData);
      } catch (err) {
        console.error("Error fetching data:", err.response?.data || err.message);
        if (err.response?.status === 401) {
          token = await refreshAccessToken();
          if (token) {
            try {
              const decodedToken = jwtDecode(token);
              const userID = decodedToken.userID;
              const userRes = await axios.get(`http://localhost:3000/api/user/${userID}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setUser(userRes.data);
              await fetchChats(token, userID);
              await fetchGroups(token, userID);
              const contactsRes = await axios.get(`http://localhost:3000/api/user/${userID}/contacts`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const contactsData = await Promise.all(
                contactsRes.data.map(async (contact) => {
                  const contactRes = await axios.get(`http://localhost:3000/api/user/${contact.userID}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  return contactRes.data;
                })
              );
              setContacts(contactsData);
            } catch (retryErr) {
              console.error("Retry error:", retryErr);
              navigate("/");
            }
          } else {
            navigate("/");
          }
        } else {
          navigate("/");
        }
      }
    };
    fetchUserAndData();
  }, [navigate, refreshAccessToken, fetchChats, fetchGroups]);

  useEffect(() => {
  socket.on("receiveMessage", async (message) => {
    if (message.groupID && message.groupID !== "NONE") {
      // Xử lý tin nhắn nhóm (giữ nguyên)
      setGroupList((prevGroupList) => {
        const groupIndex = prevGroupList.findIndex((g) => g.group.groupID === message.groupID);
        if (groupIndex >= 0) {
          const updatedGroupList = [...prevGroupList];
          updatedGroupList[groupIndex].messages.push(message);
          return [
            updatedGroupList[groupIndex],
            ...updatedGroupList.slice(0, groupIndex),
            ...updatedGroupList.slice(groupIndex + 1),
          ].sort((a, b) => {
            const lastMessageA = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
            const lastMessageB = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
            return lastMessageB - lastMessageA;
          });
        }
        return prevGroupList;
      });
    } else {
      const token = localStorage.getItem("token");
      try {
        const senderRes = await axios.get(`http://localhost:3000/api/user/${message.senderID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sender = senderRes.data;

        setChatList((prevChatList) => {
          const existingChatIndex = prevChatList.findIndex(
            (chat) => chat.conversation.userID === message.senderID
          );

          let updatedChatList;
          if (existingChatIndex >= 0) {
            updatedChatList = [...prevChatList];
            updatedChatList[existingChatIndex].messages.push(message);
          } else {
            const newChat = {
              conversation: {
                userID: message.senderID,
                username: sender.username,
                avatar: sender.avatar || "NONE",
              },
              messages: [message],
            };
            updatedChatList = [newChat, ...prevChatList];
          }

          // Sắp xếp lại danh sách hội thoại
          return updatedChatList.sort((a, b) => {
            const hasUnreadA = a.messages.some(
              (msg) => msg.senderID !== user?.userID && !msg.seenStatus.includes(user?.userID)
            );
            const hasUnreadB = b.messages.some(
              (msg) => msg.senderID !== user?.userID && !msg.seenStatus.includes(user?.userID)
            );

            if (hasUnreadA && !hasUnreadB) return -1;
            if (!hasUnreadA && hasUnreadB) return 1;

            const lastMessageA = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
            const lastMessageB = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
            return lastMessageB - lastMessageA;
          });
        });
      } catch (err) {
        console.error("Lỗi khi lấy thông tin người gửi:", err);
      }
    }
  });

 socket.on("updateChatList", (data) => {
  if (data.userID === user?.userID) {
    setChatList((prevChatList) => {
      const existingChatIndex = prevChatList.findIndex(
        (chat) => chat.conversation.userID === data.partnerID
      );

      let updatedChatList;
      if (existingChatIndex >= 0) {
        updatedChatList = [...prevChatList];
        updatedChatList[existingChatIndex].messages.push(data.message);
      } else {
        const newChat = {
          conversation: {
            userID: data.partnerID,
            username: data.partnerUsername,
            avatar: data.partnerAvatar,
          },
          messages: [data.message],
        };
        updatedChatList = [newChat, ...prevChatList];
      }

      // Sắp xếp lại chatList
      return updatedChatList.sort((a, b) => {
        const hasUnreadA = a.messages.some(
          (msg) => msg.senderID !== user?.userID && !msg.seenStatus.includes(user?.userID)
        );
        const hasUnreadB = b.messages.some(
          (msg) => msg.senderID !== user?.userID && !msg.seenStatus.includes(user?.userID)
        );

        if (hasUnreadA && !hasUnreadB) return -1;
        if (!hasUnreadA && hasUnreadB) return 1;

        const lastMessageA = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
        const lastMessageB = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
        return lastMessageB - lastMessageA;
      });
    });
  }
});

  // Các sự kiện socket khác giữ nguyên
  socket.on("groupCreated", ({ groupID }) => {
    fetchGroups(localStorage.getItem("token"), user.userID);
  });

  socket.on("groupRenamed", ({ groupID: renamedGroupID }) => {
    fetchGroups(localStorage.getItem("token"), user.userID);
  });

  socket.on("memberAdded", ({ groupID: updatedGroupID }) => {
    fetchGroups(localStorage.getItem("token"), user.userID);
  });

  socket.on("memberKicked", ({ groupID: updatedGroupID }) => {
    fetchGroups(localStorage.getItem("token"), user.userID);
  });

  socket.on("memberLeft", ({ groupID: updatedGroupID }) => {
    fetchGroups(localStorage.getItem("token"), user.userID);
  });

  socket.on("leaderSwitched", ({ groupID: updatedGroupID }) => {
    fetchGroups(localStorage.getItem("token"), user.userID);
  });

  return () => {
    socket.off("receiveMessage");
    socket.off("updateChatList");
    socket.off("groupCreated");
    socket.off("groupRenamed");
    socket.off("memberAdded");
    socket.off("memberKicked");
    socket.off("memberLeft");
    socket.off("leaderSwitched");
  };
}, [user, fetchGroups]);

  const handleSearchUser = async (e) => {
    e.preventDefault();
    setSearchError("");
    setSearchResult(null);
    if (!searchPhone.trim()) {
      setSearchError("Vui lòng nhập số điện thoại!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:3000/api/user/${searchPhone}/gmail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userRes = await axios.get(`http://localhost:3000/api/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const foundUser = userRes.data.find((u) => u.gmail === res.data.gmail);
      if (!foundUser) {
        setSearchError("Không tìm thấy người dùng!");
        return;
      }
      if (foundUser.userID === user.userID) {
        setSearchError("Không thể thêm chính bạn!");
        return;
      }
      const latestUser = await axios.get(`http://localhost:3000/api/user/${foundUser.userID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResult(latestUser.data);
    } catch (err) {
      setSearchError("Không tìm thấy người dùng!");
    }
  };

  const handleAddContact = async () => {
    if (!searchResult) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3000/api/user/${user.userID}/contacts/add`,
        { contactID: searchResult.userID },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const contactsRes = await axios.get(`http://localhost:3000/api/user/${user.userID}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contactsData = await Promise.all(
        contactsRes.data.map(async (contact) => {
          const contactRes = await axios.get(`http://localhost:3000/api/user/${contact.userID}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return contactRes.data;
        })
      );
      setContacts(contactsData);

      setSearchResult(null);
      setSearchPhone("");
      alert("Thêm liên hệ thành công!");
    } catch (err) {
      setSearchError("Lỗi khi thêm liên hệ!");
    }
  };

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
      await axios.put(
        `http://localhost:3000/api/user/changePassword/${user.phoneNumber}`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordSuccess("Đổi mật khẩu thành công!");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setPasswordSuccess("");
      }, 2000);
    } catch (err) {
      if (err.response?.status === 401) {
        setPasswordError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
        handleLogout();
      } else if (err.response?.status === 400) {
        setPasswordError("Mật khẩu cũ không đúng!");
      } else {
        setPasswordError("Lỗi server. Vui lòng thử lại sau!");
      }
    }
  };

  const closeModal = () => {
    setShowChangePasswordModal(false);
    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordError("");
    setPasswordSuccess("");
  };

  const getAvatarUrl = (avatar) => {
    return avatar && avatar !== "NONE" ? avatar : "https://via.placeholder.com/40";
  };

  const handleSelectChat = (partnerID, contact = null) => {
    setActiveTab("all");
    const existingChat = chatList.find((chat) => chat.conversation.userID === partnerID);
    if (!existingChat && contact) {
      const newChat = {
        conversation: {
          userID: partnerID,
          username: contact.username,
          avatar: contact.avatar || "NONE",
        },
        messages: [],
      };
      setChatList((prevChatList) => [
        newChat,
        ...prevChatList,
      ].sort((a, b) => {
        const lastMessageA = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
        const lastMessageB = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
        return lastMessageB - lastMessageA;
      }));
    }
    setSelectedChat(partnerID);
    setSelectedGroup(null);
  };

  const handleSelectGroup = (groupID) => {
    setSelectedGroup(groupID);
    setSelectedChat(null);
  };

  const handleBackToChatList = () => {
    setSelectedChat(null);
    setSelectedGroup(null);
  };

  const handleDeleteContact = async (contactID) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3000/api/user/${user.userID}/contacts/delete`,
        { contactID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const contactsRes = await axios.get(`http://localhost:3000/api/user/${user.userID}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contactsData = await Promise.all(
        contactsRes.data.map(async (contact) => {
          const contactRes = await axios.get(`http://localhost:3000/api/user/${contact.userID}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return contactRes.data;
        })
      );
      setContacts(contactsData);
      setShowConfirmDelete(false);
      setSelectedContactToDelete(null);
      alert("Xóa liên hệ thành công!");
    } catch (err) {
      setSearchError("Lỗi khi xóa liên hệ!");
    }
  };

  const getLastMessageInfo = (chat) => {
    if (!chat.messages || chat.messages.length === 0) return "";
    const lastMessage = chat.messages[chat.messages.length - 1];
    const messageText = lastMessage.context.length > 50
      ? lastMessage.context.substring(0, 50) + "..."
      : lastMessage.context;
    if (lastMessage.senderID === user?.userID) {
      return `Bạn: ${messageText}`;
    } else {
      return `${chat.conversation.username}: ${messageText}`;
    }
  };

  const getGroupLastMessageInfo = (group) => {
    if (!group.messages || group.messages.length === 0) return "Chưa có tin nhắn";
    const lastMessage = group.messages[group.messages.length - 1];
    const messageText = lastMessage.context.length > 50
      ? lastMessage.context.substring(0, 50) + "..."
      : lastMessage.context;
    if (lastMessage.senderID === user?.userID) {
      return `Bạn: ${messageText}`;
    } else {
      const sender = group.members.find((m) => m.userID === lastMessage.senderID);
      return `${sender?.username || "Thành viên"}: ${messageText}`;
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Tên nhóm không được để trống!");
      return;
    }
    if (selectedGroupMembers.length === 0) {
      alert("Vui lòng chọn ít nhất một thành viên cho nhóm!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const createGroupRes = await axios.post(
        "http://localhost:3000/api/group",
        { groupName, userID: user.userID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const groupID = createGroupRes.data.group.groupID;

      for (const memberID of selectedGroupMembers) {
        await axios.put(
          "http://localhost:3000/api/group/join",
          { userID: memberID, groupID },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        socket.emit("addMember", { groupID, userID: memberID });
      }

      socket.emit("groupCreated", { groupID });
      setShowCreateGroupModal(false);
      setGroupName("");
      setSelectedGroupMembers([]);
      await fetchGroups(token, user.userID);
      alert("Tạo nhóm thành công!");
    } catch (err) {
      console.error("Lỗi khi tạo nhóm:", err);
      alert(`Lỗi khi tạo nhóm: ${err.message}`);
    }
  };

  return (
    <div className="home-container">
      <div className="left-sidebar">
        <div className="user-avatar-wrapper">
          <div className="user-avatar" onClick={toggleDropdown}>
            <img src={getAvatarUrl(user?.avatar)} alt="User" />
          </div>
          {showDropdown && (
            <div className="user-dropdown">
              <div className="dropdown-username">{user?.username || "Người dùng"}</div>
              <hr className="dropdown-divider" />
              <div className="dropdown-item" onClick={() => navigate("/profile")}>
                <i className="fas fa-user-circle"></i>
                Thông tin cá nhân
              </div>
              <div className="dropdown-item" onClick={() => setShowChangePasswordModal(true)}>
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
          <div
            className={`sidebar-icon ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
            title="Tin nhắn"
          >
            <i className="fas fa-comment"></i>
          </div>
          <div
            className={`sidebar-icon ${activeTab === "groups" ? "active" : ""}`}
            onClick={() => setActiveTab("groups")}
            title="Nhóm"
          >
            <i className="fas fa-users"></i>
          </div>
          <div
            className={`sidebar-icon ${activeTab === "contacts" ? "active" : ""}`}
            onClick={() => setActiveTab("contacts")}
            title="Danh bạ"
          >
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
          <form onSubmit={handleSearchUser} className="search-bar">
            <input
              type="text"
              placeholder="Nhập số điện thoại để tìm bạn bè..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
            <button type="submit">Tìm</button>
          </form>
          {activeTab === "groups" && (
            <button
              className="create-group-btn"
              onClick={() => setShowCreateGroupModal(true)}
            >
              <i className="fas fa-plus"></i> Tạo nhóm
            </button>
          )}
        </div>

        {searchResult && (
          <div className="search-result">
            <div className="search-result-item">
              <span>{searchResult.username}</span>
              <button onClick={handleAddContact}>Thêm liên hệ</button>
            </div>
          </div>
        )}
        {searchError && <p className="error-message">{searchError}</p>}

        <div className="chat-list">
          {activeTab === "all" && (
            <>
              {chatList.length === 0 ? (
                <p className="no-chats-message">Chưa có cuộc trò chuyện nào. Hãy thêm liên hệ để bắt đầu!</p>
              ) : (
                chatList.map((chat) => (
                  <div
                    key={chat.conversation.userID}
                    className={`chat-item ${selectedChat === chat.conversation.userID ? "active" : ""}`}
                    onClick={() => handleSelectChat(chat.conversation.userID)}
                  >
                    <div className="chat-avatar">
                      <img
                        src={getAvatarUrl(chat.conversation.avatar)}
                        alt={chat.conversation.username}
                      />
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{chat.conversation.username}</div>
                      <div className="chat-last-message">
                        {getLastMessageInfo(chat)}
                      </div>
                    </div>
                    {chat.messages.some((msg) => !msg.seenStatus.includes(user?.userID)) && (
                      <span className="unread-indicator">Mới</span>
                    )}
                  </div>
                ))
              )}
            </>
          )}
          {activeTab === "groups" && (
            <>
              {groupList.length === 0 ? (
                <p>Chưa có nhóm nào. Hãy tạo nhóm để bắt đầu!</p>
              ) : (
                groupList.map((group) => (
                  <div
                    key={group.group.groupID}
                    className={`chat-item ${selectedGroup === group.group.groupID ? "active" : ""}`}
                    onClick={() => handleSelectGroup(group.group.groupID)}
                  >
                    <div className="group-avatar">
                      {group.members.slice(0, 3).map((member, index) => (
                        <img
                          key={member.userID}
                          src={getAvatarUrl(member.avatar)}
                          alt="Member"
                          className={`avatar-${index}`}
                        />
                      ))}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{group.group.groupName}</div>
                      <div className="chat-last-message">
                        {getGroupLastMessageInfo(group)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
          {activeTab === "contacts" && (
            <>
              {contacts.length === 0 ? (
                <p>Chưa có liên hệ nào. Hãy thêm liên hệ để bắt đầu!</p>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.userID}
                    className={`chat-item ${selectedChat === contact.userID ? "active" : ""}`}
                    onClick={() => handleSelectChat(contact.userID, contact)}
                  >
                    <div className="chat-avatar">
                      <img src={getAvatarUrl(contact.avatar)} alt={contact.username} />
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{contact.username}</div>
                    </div>
                    <div className="delete-option">
                      <i
                        className="fas fa-ellipsis-h"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContactToDelete(contact);
                          setShowConfirmDelete(true);
                        }}
                      ></i>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      <div className="chat-content">
        {selectedChat ? (
          <ChatBox user={user} partnerID={selectedChat} onBack={handleBackToChatList} />
        ) : selectedGroup ? (
          <GroupChatBox user={user} groupID={selectedGroup} onBack={handleBackToChatList} fetchGroups={fetchGroups} />
        ) : (
          <div className="empty">Chọn một cuộc trò chuyện, nhóm hoặc liên hệ để bắt đầu</div>
        )}
      </div>

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

      {showConfirmDelete && selectedContactToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Xác nhận xóa liên hệ</h2>
              <button className="modal-close" onClick={() => setShowConfirmDelete(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p>Bạn có muốn xóa liên hệ "{selectedContactToDelete.username}" không?</p>
            <div className="modal-buttons">
              <button
                className="save-button"
                onClick={() => handleDeleteContact(selectedContactToDelete.userID)}
              >
                Xác nhận
              </button>
              <button className="cancel-button" onClick={() => setShowConfirmDelete(false)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateGroupModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Tạo nhóm mới</h2>
              <button className="modal-close" onClick={() => setShowCreateGroupModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="form-group">
              <label htmlFor="groupName">Tên nhóm</label>
              <input
                type="text"
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Chọn thành viên</label>
              <ul className="contact-list">
                {contacts.map((contact) => (
                  <li key={contact.userID}>
                    <input
                      type="checkbox"
                      checked={selectedGroupMembers.includes(contact.userID)}
                      onChange={() => {
                        setSelectedGroupMembers((prev) =>
                          prev.includes(contact.userID)
                            ? prev.filter((id) => id !== contact.userID)
                            : [...prev, contact.userID]
                        );
                      }}
                    />
                    {contact.username}
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-buttons">
              <button className="save-button" onClick={handleCreateGroup}>
                Tạo nhóm
              </button>
              <button className="cancel-button" onClick={() => setShowCreateGroupModal(false)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}