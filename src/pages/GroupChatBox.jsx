import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import socket from "../socket";
import "../styles/GroupChatBox.css";

export default function GroupChatBox({ user, groupID, onBack, fetchGroups }) {
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showKickMemberModal, setShowKickMemberModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showSwitchLeaderModal, setShowSwitchLeaderModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [contacts, setContacts] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedMemberToKick, setSelectedMemberToKick] = useState(null);
  const [selectedMemberToLead, setSelectedMemberToLead] = useState(null);

  const fetchGroupInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const groupRes = await axios.get(`http://localhost:3000/api/group/${groupID}/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroup(groupRes.data.data);

      const membersRes = await axios.get(`http://localhost:3000/api/group/${groupID}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(membersRes.data.data);

      const messagesRes = await axios.get(`http://localhost:3000/api/message/group/${groupID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(messagesRes.data);
    } catch (err) {
      console.error("Lỗi khi lấy thông tin nhóm:", err);
      if (err.response?.status === 404) {
        alert("Nhóm không tồn tại hoặc đã bị xóa!");
        const token = localStorage.getItem("token"); // Khai báo token
        fetchGroups(token, user.userID).then(() => onBack());
      }
    }
  }, [groupID, user.userID, fetchGroups]);

  const fetchContacts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
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
    } catch (err) {
      console.error("Lỗi khi lấy danh bạ:", err);
    }
  }, [user.userID]);

  useEffect(() => {
    fetchGroupInfo();
    fetchContacts();
    //socket.emit("joinGroup", user.userID, groupID);
  }, [fetchGroupInfo, fetchContacts, user.userID, groupID]);

  useEffect(() => {
    socket.on("receiveMessage", (message) => {
      if (message.groupID === groupID) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on("groupDeleted", (deletedGroupID) => {
      if (deletedGroupID === groupID) {
        alert("Nhóm đã bị xóa!");
        fetchGroups(localStorage.getItem("token"), user.userID)
          .then(() => onBack())
          .catch((err) => {
            console.error("Lỗi khi cập nhật danh sách nhóm sau khi xóa:", err);
            onBack();
          });
      }
    });

    socket.on("groupRenamed", ({ groupID: renamedGroupID, newGroupName }) => {
      if (renamedGroupID === groupID) {
        setGroup((prev) => ({ ...prev, groupName: newGroupName }));
        fetchGroups(localStorage.getItem("token"), user.userID);
      }
    });

    socket.on("memberAdded", ({ groupID: updatedGroupID }) => {
      if (updatedGroupID === groupID) {
        fetchGroupInfo();
        fetchGroups(localStorage.getItem("token"), user.userID);
      }
    });

    socket.on("memberKicked", ({ groupID: updatedGroupID, userID: kickedUserID }) => {
      if (updatedGroupID === groupID) {
        if (kickedUserID === user.userID) {
          alert("Bạn đã bị xóa khỏi nhóm!");
          fetchGroups(localStorage.getItem("token"), user.userID)
            .then(() => onBack())
            .catch((err) => {
              console.error("Lỗi khi cập nhật danh sách nhóm sau khi bị kick:", err);
              onBack();
            });
        } else {
          fetchGroupInfo();
          fetchGroups(localStorage.getItem("token"), user.userID);
        }
      }
    });

    socket.on("memberLeft", ({ groupID: updatedGroupID, userID: leftUserID }) => {
      if (updatedGroupID === groupID) {
        fetchGroupInfo();
        fetchGroups(localStorage.getItem("token"), user.userID);
      }
    });

    socket.on("leaderSwitched", ({ groupID: updatedGroupID }) => {
      if (updatedGroupID === groupID) {
        fetchGroupInfo();
        fetchGroups(localStorage.getItem("token"), user.userID);
      }
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("groupDeleted");
      socket.off("groupRenamed");
      socket.off("memberAdded");
      socket.off("memberKicked");
      socket.off("memberLeft");
      socket.off("leaderSwitched");
    };
  }, [groupID, onBack, user.userID, fetchGroups,onBack]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const messageTypeID = "type1"; // Text message
      const messageID = `msg-${Date.now()}`;
      const message = {
        messageID,
        senderID: user.userID,
        groupID,
        messageTypeID,
        context: newMessage,
        seenStatus: [user.userID],
        createdAt: new Date().toISOString(),
      };

      socket.emit("sendMessage", message);
      // await axios.post(
      //   "http://localhost:3000/api/message",
      //   { ...message, receiverID: "NONE" },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      setNewMessage("");
    } catch (err) {
      console.error("Lỗi khi gửi tin nhắn:", err);
    }
  };

  const handleAddMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      for (const contactID of selectedContacts) {
        // const joinRes = await axios.put(
        //   "http://localhost:3000/api/group/join",
        //   { userID: contactID, groupID },
        //   { headers: { Authorization: `Bearer ${token}` } }
        // );
        // if (joinRes.status !== 200) {
        //   throw new Error(`Không thể thêm thành viên ${contactID}`);
        // }
        socket.emit("addGroupMember",  contactID ,groupID,()=>{});
      }
      setSelectedContacts([]);
      setShowAddMemberModal(false);
      fetchGroupInfo();
      fetchGroups(token, user.userID);
      alert("Thêm thành viên thành công!");
    } catch (err) {
      console.error("Lỗi khi thêm thành viên:", err);
      alert(`Lỗi khi thêm thành viên: ${err.message}`);
    }
  };

  const handleKickMember = async () => {
    try {
      const token = localStorage.getItem("token");
      // await axios.put(
      //   `http://localhost:3000/api/group/kick`,
      //   { userID: selectedMemberToKick.userID, groupID },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      socket.emit("kickMember",user.userID, selectedMemberToKick, groupID, ()=>{
        console.log("kick thanh cong");
        
      });
      setShowKickMemberModal(false);
      setSelectedMemberToKick(null);
      fetchGroupInfo();
      fetchGroups(token, user.userID);
      alert("Xóa thành viên thành công!");
    } catch (err) {
      console.error("Lỗi khi xóa thành viên:", err);
      alert("Lỗi khi xóa thành viên!");
    }
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim()) {
      alert("Tên nhóm không được để trống!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      // await axios.put(
      //   `http://localhost:3000/api/group/rename`,
      //   { groupID, newGroupName },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      socket.emit("renameGroup", groupID, newGroupName,()=>{});
      setShowRenameModal(false);
      setNewGroupName("");
      fetchGroupInfo();
      fetchGroups(token, user.userID);
      alert("Đổi tên nhóm thành công!");
    } catch (err) {
      console.error("Lỗi khi đổi tên nhóm:", err);
      alert("Lỗi khi đổi tên nhóm!");
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const token = localStorage.getItem("token");
      // await axios.put(
      //   `http://localhost:3000/api/group/leave`,
      //   { userID: user.userID, groupID },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      socket.emit("leaveGroup",user.userID, groupID,()=>{});
      alert("Rời nhóm thành công!");
      await fetchGroups(token, user.userID);
      onBack();
    } catch (err) {
      console.error("Lỗi khi rời nhóm:", err);
      alert(`Lỗi khi rời nhóm: ${err.response?.data?.message || err.message}`);
    }
  };

 const handleDeleteGroup = async () => {
  const isLeader = members.find((m) => m.userID === user.userID)?.memberRole === "LEADER";
  if (!isLeader) {
    alert("Chỉ Leader mới có quyền xóa nhóm!");
    return;
  }

  const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa nhóm này không?");
  if (!confirmDelete) return;

  try {
    const token = localStorage.getItem("token");
    // const response = await axios.delete(`http://localhost:3000/api/group/${groupID}`, {
    //   headers: { Authorization: `Bearer ${token}` },
    // });
    console.log("Xóa nhóm thành công:");
    socket.emit("deleteGroup", user.userID,groupID,()=>{}); // Phát sự kiện xóa nhóm
    await fetchGroups(token, user.userID);
    onBack();
  } catch (err) {
    console.error("Lỗi khi xóa nhóm:", err.response?.data || err.message);
    alert("Không thể xóa nhóm. Vui lòng thử lại!");
  }
};

  const handleSwitchLeader = async () => {
    try {
      const token = localStorage.getItem("token");
      // await axios.put(
      //   `http://localhost:3000/api/group/switchRole`,
      //   { userID: user.userID, targetUserID: selectedMemberToLead.userID, groupID },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      socket.emit("switchRole",user.userID, selectedMemberToLead, groupID,()=>{} );
      setShowSwitchLeaderModal(false);
      setSelectedMemberToLead(null);
      fetchGroupInfo();
      fetchGroups(token, user.userID);
      alert("Chuyển quyền Leader thành công!");
    } catch (err) {
      console.error("Lỗi khi chuyển quyền Leader:", err);
      alert("Lỗi khi chuyển quyền Leader!");
    }
  };

  const getAvatarUrl = (avatar) => {
    return avatar && avatar !== "NONE" ? avatar : "https://picsum.photos/40";
  };

  const isLeader = members.find((m) => m.userID === user.userID)?.memberRole === "LEADER";

  return (
    <div className="group-chat-box-container">
      <div className="group-chat-box-header">
        <button className="back-button" onClick={onBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="group-info">
          <div className="group-avatar">
            {members.slice(0, 3).map((member, index) => (
              <img
                key={member.userID}
                src={getAvatarUrl(member.avatar)}
                alt="Member"
                className={`avatar-${index}`}
              />
            ))}
          </div>
          <span>{group?.groupName}</span>
          <div className="connection-status">{members.length} thành viên</div>
        </div>
        <button
          className="group-options-button"
          onClick={() => setShowGroupOptions(!showGroupOptions)}
        >
          <i className="fas fa-ellipsis-v"></i>
        </button>
        {showGroupOptions && (
          <div className="group-options-menu">
            <div className="group-options-item" onClick={() => setShowAddMemberModal(true)}>
              Thêm thành viên
            </div>
            {isLeader && (
              <div className="group-options-item" onClick={() => setShowKickMemberModal(true)}>
                Xóa thành viên
              </div>
            )}
            <div className="group-options-item" onClick={() => setShowRenameModal(true)}>
              Đổi tên nhóm
            </div>
            <div className="group-options-item" onClick={handleLeaveGroup}>
              Rời nhóm
            </div>
            {isLeader && (
              <div className="group-options-item" onClick={handleDeleteGroup}>
                Xóa nhóm
              </div>
            )}
            {isLeader && (
              <div className="group-options-item" onClick={() => setShowSwitchLeaderModal(true)}>
                Chuyển quyền Leader
              </div>
            )}
          </div>
        )}
      </div>
      <div className="group-chat-box-messages">
        {messages.map((msg) => (
          <div
            key={msg.messageID}
            className={`message ${msg.senderID === user.userID ? "sent" : "received"}`}
          >
            <div className="message-content">{msg.context}</div>
            <div className="message-meta">
              <span className="message-time">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="group-chat-box-input">
        <form onSubmit={handleSendMessage} className="input-group">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
          />
          <button type="submit">
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>

      {showAddMemberModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Thêm thành viên</h2>
              <button className="modal-close" onClick={() => setShowAddMemberModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <ul className="contact-list">
              {contacts.map((contact) => (
                <li key={contact.userID}>
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.userID)}
                    onChange={() => {
                      setSelectedContacts((prev) =>
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
            <div className="modal-buttons">
              <button className="save-button" onClick={handleAddMembers}>
                Thêm
              </button>
              <button className="cancel-button" onClick={() => setShowAddMemberModal(false)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showKickMemberModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Xóa thành viên</h2>
              <button className="modal-close" onClick={() => setShowKickMemberModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <ul className="contact-list">
              {members
                .filter((m) => m.userID !== user.userID)
                .map((member) => (
                  <li
                    key={member.userID}
                    onClick={() => setSelectedMemberToKick(member)}
                    style={{
                      cursor: "pointer",
                      background:
                        selectedMemberToKick?.userID === member.userID
                          ? "#f0f2f5"
                          : "transparent",
                    }}
                  >
                    {member.username} {member.memberRole === "LEADER" && "(Leader)"}
                  </li>
                ))}
            </ul>
            <div className="modal-buttons">
              <button
                className="save-button"
                onClick={handleKickMember}
                disabled={!selectedMemberToKick}
              >
                Xóa
              </button>
              <button className="cancel-button" onClick={() => setShowKickMemberModal(false)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
  <div className="modal-overlay">
    <div className="modal">
      <div className="modal-header">
        <h2>Đổi tên nhóm</h2>
        <button className="modal-close" onClick={() => setShowRenameModal(false)}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className="form-group">
        <label htmlFor="newGroupName">Tên nhóm mới</label>
        <input
          type="text"
          id="newGroupName"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Nhập tên nhóm mới..."
          className="rename-input"
          maxLength={50} // Giới hạn độ dài tên nhóm
          autoFocus
        />
        {newGroupName.trim().length === 0 && (
          <p className="error-message">Tên nhóm không được để trống!</p>
        )}
      </div>
      <div className="modal-buttons">
        <button
          className="save-button"
          onClick={handleRenameGroup}
          disabled={!newGroupName.trim()} // Vô hiệu hóa nút nếu tên nhóm trống
        >
          Lưu
        </button>
        <button className="cancel-button" onClick={() => setShowRenameModal(false)}>
          Hủy
        </button>
      </div>
    </div>
  </div>
)}

      {showSwitchLeaderModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Chuyển quyền Leader</h2>
              <button className="modal-close" onClick={() => setShowSwitchLeaderModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <ul className="contact-list">
              {members
                .filter((m) => m.userID !== user.userID)
                .map((member) => (
                  <li
                    key={member.userID}
                    onClick={() => setSelectedMemberToLead(member)}
                    style={{
                      cursor: "pointer",
                      background:
                        selectedMemberToLead?.userID === member.userID
                          ? "#f0f2f5"
                          : "transparent",
                    }}
                  >
                    {member.username}
                  </li>
                ))}
            </ul>
            <div className="modal-buttons">
              <button
                className="save-button"
                onClick={handleSwitchLeader}
                disabled={!selectedMemberToLead}
              >
                Chuyển
              </button>
              <button className="cancel-button" onClick={() => setShowSwitchLeaderModal(false)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
