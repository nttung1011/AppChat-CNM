import { useEffect, useState, useRef } from "react";
import socket from "../socket";
import axios from "axios";
import Picker from "emoji-picker-react";
import "../styles/ChatBox.css";

export default function ChatBox({ user, partnerID, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [partner, setPartner] = useState(null);
  const [file, setFile] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Đang kết nối...");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setConnectionStatus("Đã kết nối");

    socket.on("connect_error", (error) => {
      setConnectionStatus(`Lỗi kết nối: ${error.message}`);
    });

    socket.on("disconnect", (reason) => {
      setConnectionStatus(`Ngắt kết nối: ${reason}`);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, [user]);

  const handleReceiveMessageChatBox=(message) => {
    console.log("Tin nhắn mới nhận được:", message);
    if(message.groupID!=="NONE")
      return
    if ((message.senderID === partnerID && message.receiverID === user.userID) || (message.senderID === user.userID && message.receiverID === partnerID)) {
      setMessages((prev) => [...prev, message]);
      socket.emit("seenMessage", message.messageID, user.userID);
    }
  }

 useEffect(() => {
  console.log("Thiết lập lắng nghe sự kiện Socket.IO cho partnerID:", partnerID);

  socket.on("receiveMessage", handleReceiveMessageChatBox);

  socket.on("updateSingleChatSeenStatus", (messageID) => {
    console.log("Cập nhật trạng thái seen:", messageID);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.messageID === messageID
          ? { ...msg, seenStatus: [...msg.seenStatus, partnerID] }
          : msg
      )
    );
  });

  socket.on("deletedSingleMessage", (messageID) => {
    console.log("Xóa tin nhắn:", messageID);
    setMessages((prev) => prev.filter((msg) => msg.messageID !== messageID));
  });

  socket.on("recalledSingleMessage", (messageID) => {
    console.log("Thu hồi tin nhắn:", messageID);
    setMessages((prev) => prev.filter((msg) => msg.messageID !== messageID));
  });

  return () => {
    console.log("Dọn dẹp sự kiện Socket.IO");
    socket.off("receiveMessage",handleReceiveMessageChatBox);
    socket.off("updateSingleChatSeenStatus");
    socket.off("deletedSingleMessage");
    socket.off("recalledSingleMessage");
  };
}, [partnerID]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token not found");

        const partnerRes = await axios.get(`http://13.211.212.72:3000/api/user/${partnerID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPartner(partnerRes.data);

        const messagesRes = await axios.get(
          `http://13.211.212.72:3000/api/message/single/${user.userID}/${partnerID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const messagesData=messagesRes.data||[]        
        const filteredMessages = messagesData.filter(
          msg => !msg.deleteStatusByUser?.includes(user.userID)
        );
        setMessages(filteredMessages);

        const contactsRes = await axios.get(`http://13.211.212.72:3000/api/user/${user.userID}/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const updatedContacts = contactsRes.data.map(contact => ({
          ...contact,
          avatar: contact.avatar || "https://via.placeholder.com/30"
        }));
        setContacts(updatedContacts);

        messagesRes.data.forEach((msg) => {
          if (!msg.seenStatus.includes(user.userID) && msg.senderID !== user.userID) {
            socket.emit("seenMessage", msg.messageID, user.userID);
          }
        });
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu:", err.response?.data || err.message);
      }
    };

    if (user?.userID && partnerID) fetchData();
  }, [user, partnerID]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const menu = document.querySelector('.message-menu');
      if (menu && !menu.contains(event.target)) {
        setShowMessageMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const onEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) {
      alert("Vui lòng nhập tin nhắn hoặc đính kèm file!");
      return;
    }
    if (connectionStatus !== "Đã kết nối") {
      alert("Vui lòng chờ kết nối hoàn tất!");
      return;
    }

    if (!user?.userID || !partnerID) {
      alert("Lỗi: Thiếu thông tin người dùng hoặc người nhận!");
      return;
    }

    const messageID = `${user.userID}-${Date.now()}`;
    let fileData = null;

    if (file) {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          fileData = {
            name: file.name,
            data: reader.result.split(",")[1],
            type: file.type,
          };

          const messageData = {
            senderID: user.userID,
            receiverID: partnerID,
            messageTypeID: getMessageTypeFromFile(file),
            context: newMessage || file.name,
            messageID,
            file: fileData,
            senderAvatar: user.avatar || "NONE",
            senderUsername: user.username,
            createdAt: new Date().toISOString(),
          };

          socket.emit("sendMessage", messageData, (response) => {
            if (response === "Đã nhận") {
              setNewMessage("");
              setFile(null);
              fileInputRef.current.value = null;
              // Phát sự kiện để cập nhật chatList và conversationsID
              socket.emit("updateChatList", {
                userID: user.userID,
                partnerID: partnerID,
                partnerUsername: partner?.username || "Người dùng",
                partnerAvatar: partner?.avatar || "NONE",
                message: messageData,
              });
            } else {
              alert("Lỗi khi gửi tin nhắn: " + response);
            }
          });
        };
        reader.onerror = () => {
          alert("Lỗi khi đọc file!");
        };
      } catch (err) {
        alert("Lỗi khi xử lý file: " + err.message);
      }
    } else {
      const messageData = {
        senderID: user.userID,
        receiverID: partnerID,
        messageTypeID: "type1",
        context: newMessage,
        messageID,
        file: null,
        senderAvatar: user.avatar || "NONE",
        senderUsername: user.username,
        createdAt: new Date().toISOString(),
      };

      socket.emit("sendMessage", messageData, (response) => {
        if (response === "Đã nhận") {
          setNewMessage("");
          // Phát sự kiện để cập nhật chatList và conversationsID
          socket.emit("updateChatList", {
            userID: user.userID,
            partnerID: partnerID,
            partnerUsername: partner?.username || "Người dùng",
            partnerAvatar: partner?.avatar || "NONE",
            message: messageData,
          });
        } else {
          alert("Lỗi khi gửi tin nhắn: " + response);
        }
      });
    }
  };

  const getMessageTypeFromFile = (file) => {
    const fileType = file.type.split('/')[0];
    switch (fileType) {
      case 'image':
        return "type2";
      case 'video':
        return "type3";
      case 'audio':
        return "type5";
      default:
        return "type6";
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDeleteMessage = (messageID) => {
    socket.emit("deleteMessage", messageID, user.userID, (response) => {
      setShowMessageMenu(null);
    });
  };

  const handleRecallMessage = (messageID) => {
    socket.emit("recallMessage", messageID, user.userID, (response) => {
      setShowMessageMenu(null);
    });
  };

  const handleForwardMessage = (msg) => {
    setForwardMessage(msg);
    setShowMessageMenu(null);
  };

  const handleSendForwardMessage = async (targetUserID) => {
    if (!user?.userID || !targetUserID || !forwardMessage) {
      alert("Lỗi: Thiếu thông tin để chuyển tiếp tin nhắn!");
      return;
    }

    const messageID = `${user.userID}-${Date.now()}`;
    const messageData = {
      senderID: user.userID,
      receiverID: targetUserID,
      groupID: "NONE",
      messageTypeID: forwardMessage.messageTypeID,
      context: forwardMessage.context,
      messageID,
      file: forwardMessage.file || null,
      senderAvatar: user.avatar || "NONE",
      senderUsername: user.username,
      createdAt: new Date().toISOString(),
    };

    socket.emit("sendMessage", messageData, (response) => {
      if (response === "Đã nhận") {
        setForwardMessage(null);
        // Phát sự kiện để cập nhật chatList và conversationsID
        socket.emit("updateChatList", {
          userID: user.userID,
          partnerID: targetUserID,
          partnerUsername: contacts.find(c => c.userID === targetUserID)?.username || "Người dùng",
          partnerAvatar: contacts.find(c => c.userID === targetUserID)?.avatar || "NONE",
          message: messageData,
        });
      } else {
        alert("Lỗi khi chuyển tiếp tin nhắn: " + response);
      }
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getLatestSentMessage = () => {
    const sentMessages = messages.filter((msg) => msg.senderID === user.userID);
    return sentMessages[sentMessages.length - 1];
  };

  const handleMessagesClick = (e) => {
    if (e.target.classList.contains('chat-box-messages')) {
      setShowMessageMenu(null);
    }
  };

  const handleDoubleClick = (messageID) => {
    if (showMessageMenu === messageID) {
      setShowMessageMenu(null);
    } else {
      setShowMessageMenu(messageID);
    }
  };

  return (
    <div className="chat-box-container">
      <div className="chat-box-header">
        <button onClick={onBack} className="back-button">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="partner-info">
          <img
            src={
              partner && partner.avatar !== "NONE"
                ? partner.avatar
                : "https://picsum.photos/40"
            }
            alt="Partner"
            className="partner-avatar"
          />
          <span>{partner?.username || "Đang tải..."}</span>
        </div>
        <span className="connection-status">{connectionStatus}</span>
      </div>
      <div className="chat-box-messages" onClick={handleMessagesClick}>
        {messages.map((msg, index) => (
          <div
            key={msg.messageID}
            className={`message ${msg.senderID === user.userID ? "sent" : "received"}`}
          >
            <div
              className="message-content"
              onDoubleClick={() => msg.senderID === user.userID && handleDoubleClick(msg.messageID)}
            >
              {msg.messageTypeID === "type2" ? (
                <a href={msg.context} target="_blank" rel="noopener noreferrer">
                  <img src={msg.context} alt="Hình ảnh" style={{ maxWidth: "200px" }} />
                </a>
              ) : msg.messageTypeID === "type3" ? (
                <video controls style={{ maxWidth: "200px" }}>
                  <source src={msg.context} type="video/mp4" />
                  Video của bạn
                </video>
              ) : msg.messageTypeID === "type5" || msg.messageTypeID === "type6" ? (
                <a href={msg.context} target="_blank" rel="noopener noreferrer">
                  Tệp: {msg.context.split("/").pop()}
                </a>
              ) : (
                msg.context
              )}
            </div>
            <div className="message-meta">
              <span className="message-time">{formatTime(msg.createdAt)}</span>
              {msg.senderID === user.userID && msg.messageID === getLatestSentMessage()?.messageID && (
                <span className="message-status">
                  {msg.seenStatus.includes(partnerID) ? "Đã xem" : "Đã nhận"}
                </span>
              )}
            </div>
            {showMessageMenu === msg.messageID && msg.senderID === user.userID && (
              <div className="message-menu">
                <div className="message-menu-item" onClick={() => handleDeleteMessage(msg.messageID)}>
                  Xóa
                </div>
                <div className="message-menu-item" onClick={() => handleRecallMessage(msg.messageID)}>
                  Thu hồi
                </div>
                <div className="message-menu-item" onClick={() => handleForwardMessage(msg)}>
                  Chuyển tiếp
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {forwardMessage && (
        <div className="forward-modal">
          <h3>Chuyển tiếp tin nhắn</h3>
          <ul>
            {contacts.map((contact) => (
              <li key={contact.userID}>
                <img
                  src={contact.avatar}
                  alt={`${contact.username}'s avatar`}
                  className="contact-avatar"
                />
                <button onClick={() => handleSendForwardMessage(contact.userID)}>
                  {contact.username}
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setForwardMessage(null)}>Hủy</button>
        </div>
      )}
      <form onSubmit={handleSendMessage} className="chat-box-input">
        <div className="input-group">
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="emoji-button"
          >
            😊
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker">
              <Picker onEmojiClick={onEmojiClick} />
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="file-button"
          >
            📎
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
          />
          <button type="submit">
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
        {file && <span className="file-name">{file.name}</span>}
      </form>
    </div>
  );
}
