import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import socket, { connectSocketWithToken } from '../socket';
import '../styles/GroupChatBox.css';
import ShareIcon from '@mui/icons-material/Share';
import ReplyIcon from '@mui/icons-material/Reply';
import RestoreIcon from '@mui/icons-material/Restore';
import ShareMessageModal from '../components/ShareMessageModal';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GroupMembers from '../components/GroupMembers';
import KickMemberModal from '../components/KickMemberModal';
import Picker from "emoji-picker-react";

export default function GroupChatBox({ user, groupID, onBack, fetchGroups }) {
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showKickMemberModal, setShowKickMemberModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showSwitchLeaderModal, setShowSwitchLeaderModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [contacts, setContacts] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  // const [selectedMemberToKick, setSelectedMemberToKick] = useState(null);
  const [selectedMemberToLead, setSelectedMemberToLead] = useState(null);
  const [showShareMessageModal, setShowShareMessageModal] = useState(false);
  const [selectedMessageToShare, setSelectedMessageToShare] = useState(null);
  const [replyMessage, setReplyMessage] = useState(null);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const messageBoxRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);

  const fetchGroupInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const groupRes = await axios.get(`http://13.211.212.72:3000/api/group/${groupID}/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroup(groupRes.data.data);

      const membersRes = await axios.get(`http://13.211.212.72:3000/api/group/${groupID}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(membersRes.data.data);

      const messagesRes = await axios.get(`http://13.211.212.72:3000/api/message/group/${groupID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(messagesRes.data);
      messagesRes.data.forEach(msg => {
        if (!msg.seenStatus.includes(user.userID) && msg.senderID !== user.userID) {
          socket.emit('seenMessage', msg.messageID, user.userID);
        }
      });
    } catch (err) {
      console.error('Lỗi khi lấy thông tin nhóm:', err);
      if (err.response?.status === 404) {
        alert('Nhóm không tồn tại hoặc đã bị xóa!');
        const token = localStorage.getItem('token'); // Khai báo token
        fetchGroups(token, user.userID).then(() => onBack());
      }
    }
  }, [groupID, user.userID, fetchGroups]);

  const fetchContacts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const contactsRes = await axios.get(
        `http://13.211.212.72:3000/api/user/${user.userID}/contacts`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const contactsData = await Promise.all(
        contactsRes.data.map(async contact => {
          const contactRes = await axios.get(`http://13.211.212.72:3000/api/user/${contact.userID}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return contactRes.data;
        })
      );
      setContacts(contactsData);
    } catch (err) {
      console.error('Lỗi khi lấy danh bạ:', err);
    }
  }, [user.userID, showAddMemberModal]);

  useEffect(() => {
    fetchGroupInfo();
    fetchContacts();
    //socket.emit("joinGroup", user.userID, groupID);
  }, [fetchGroupInfo, fetchContacts, user.userID, groupID]);

  useEffect(() => {
    socket.on('receiveMessage', message => {
      console.log('received message');
      if (message.groupID === groupID) {
        setMessages(prev => [...prev, message]);
        if (message.senderID !== user.userID) {
          socket.emit('seenMessage', message.messageID, user.userID);
        }
      }
    });

    socket.on('groupRenamed', ({ groupID: renamedGroupID, newGroupName }) => {
      if (renamedGroupID === groupID) {
        setGroup(prev => ({ ...prev, groupName: newGroupName }));
        fetchGroups(localStorage.getItem('token'), user.userID);
      }
    });

    socket.on('memberAdded', ({ groupID: updatedGroupID }) => {
      if (updatedGroupID === groupID) {
        fetchGroupInfo();
        fetchGroups(localStorage.getItem('token'), user.userID);
      }
    });

    socket.on('newMember', userID => {
      console.log('New member joined:', userID);
      if (userID === user.userID) {
        fetchGroups(localStorage.getItem('token'), user.userID);
      } else {
        fetchGroupInfo();
      }
    });

    socket.on('memberLeft', (updatedGroupID, leftUserID) => {
      console.log('Member left:', { updatedGroupID, leftUserID });
      if (updatedGroupID === groupID && leftUserID !== user.userID) {
        fetchGroupInfo();
        return;
      }
    });

    socket.on('leaderSwitched', ({ groupID: updatedGroupID }) => {
      if (updatedGroupID === groupID) {
        fetchGroupInfo();
        fetchGroups(localStorage.getItem('token'), user.userID);
      }
    });

    socket.on('recalledGroupMessage', messageID => {
      setMessages(prev => prev.filter(msg => msg.messageID !== messageID));
    });

    socket.on('forceLeaveGroup', (leavingUserID, updatedGroupID) => {
      if (updatedGroupID == groupID && leavingUserID == user.userID) {
        alert('Bạn đã bị buộc rời khỏi nhóm!');
        fetchGroups(localStorage.getItem('token'), user.userID)
          .then(() => onBack())
          .catch(err => {
            console.error('Lỗi khi cập nhật danh sách nhóm sau khi bị buộc rời:', err);
            onBack();
          });
        socket.off('forceLeaveGroup');
        return;
      }
      if (updatedGroupID === groupID) {
        fetchGroupInfo();
      }
    });

    socket.on('groupDeleted', deletedGroupID => {
      console.log('Group deleted:', deletedGroupID);
      fetchGroups(localStorage.getItem('token'), user.userID);
      if (deletedGroupID === groupID) {
        onBack();
      }
    });

    // connectSocketWithToken();

    return () => {
      socket.off('receiveMessage');
      socket.off('groupDeleted');
      socket.off('groupRenamed');
      socket.off('memberAdded');
      socket.off('memberKicked');
      socket.off('memberLeft');
      socket.off('leaderSwitched');
      socket.off('recalledGroupMessage');
      socket.off('forceLeaveGroup');
      socket.off('newMember');
    };
  }, [groupID, onBack, user.userID, fetchGroups]);

  //scroll to bottom
  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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

    if (!user?.userID || !groupID) {
      alert("Lỗi: Thiếu thông tin người dùng hoặc nhóm!");
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
            messageID,
            senderID: user.userID,
            groupID,
            messageTypeID: getMessageTypeFromFile(file),
            context: newMessage || file.name,
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
        messageID,
        senderID: user.userID,
        groupID,
        messageTypeID: "type1",
        context: newMessage,
        file: null,
        senderAvatar: user.avatar || "NONE",
        senderUsername: user.username,
        seenStatus: [user.userID],
        createdAt: new Date().toISOString(),
      };

      socket.emit("sendMessage", messageData, (response) => {
        if (response === "Đã nhận") {
          setNewMessage("");
        } else {
          alert("Lỗi khi gửi tin nhắn: " + response);
        }
      });
    }
  };

  const handleAddMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      for (const contactID of selectedContacts) {
        // const joinRes = await axios.put(
        //   "http://13.211.212.72:3000/api/group/join",
        //   { userID: contactID, groupID },
        //   { headers: { Authorization: `Bearer ${token}` } }
        // );
        // if (joinRes.status !== 200) {
        //   throw new Error(`Không thể thêm thành viên ${contactID}`);
        // }
        socket.emit('addGroupMember', contactID, groupID, res => {
          console.log(res);
        });
      }
      setSelectedContacts([]);
      setShowAddMemberModal(false);
      fetchGroupInfo();
      fetchGroups(token, user.userID);
    } catch (err) {
      console.error('Lỗi khi thêm thành viên:', err);
      alert(`Lỗi khi thêm thành viên: ${err.message}`);
    }
  };

  const handleKickMember = async selectedMemberToKick => {
    try {
      const token = localStorage.getItem('token');
      // await axios.put(
      //   `http://13.211.212.72:3000/api/group/kick`,
      //   { userID: selectedMemberToKick.userID, groupID },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );

      socket.emit('kickMember', user.userID, selectedMemberToKick.userID, groupID, res => {
        console.log(res);
        alert(res);
      });
      setShowKickMemberModal(false);
      fetchGroupInfo();
      fetchGroups(token, user.userID);
    } catch (err) {
      console.error('Lỗi khi xóa thành viên:', err);
      alert('Lỗi khi xóa thành viên!');
    }
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Tên nhóm không được để trống!');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      // await axios.put(
      //   `http://13.211.212.72:3000/api/group/rename`,
      //   { groupID, newGroupName },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      socket.emit('renameGroup', groupID, newGroupName, () => {});
      setShowRenameModal(false);
      setNewGroupName('');
      fetchGroupInfo();
      fetchGroups(token, user.userID);
      alert('Đổi tên nhóm thành công!');
    } catch (err) {
      console.error('Lỗi khi đổi tên nhóm:', err);
      alert('Lỗi khi đổi tên nhóm!');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const token = localStorage.getItem('token');
      // await axios.put(
      //   `http://13.211.212.72:3000/api/group/leave`,
      //   { userID: user.userID, groupID },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      socket.emit('leaveGroup', user.userID, groupID, res => {
        console.log(res);
        alert(res);
        fetchGroups(token, user.userID).then(() => onBack());
      });
    } catch (err) {
      console.error('Lỗi khi rời nhóm:', err);
      alert(`Lỗi khi rời nhóm: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteGroup = async () => {
    const isLeader = members.find(m => m.userID === user.userID)?.memberRole === 'LEADER';
    if (!isLeader) {
      alert('Chỉ Leader mới có quyền xóa nhóm!');
      return;
    }

    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa nhóm này không?');
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      // const response = await axios.delete(`http://13.211.212.72:3000/api/group/${groupID}`, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      socket.emit('deleteGroup', user.userID, groupID, res => {
        console.log(res);
        alert(res);
      });
    } catch (err) {
      console.error('Lỗi khi xóa nhóm:', err.response?.data || err.message);
      alert('Không thể xóa nhóm. Vui lòng thử lại!');
    }
  };

  const handleSwitchLeader = async () => {
    try {
      const token = localStorage.getItem('token');
      // await axios.put(
      //   `http://13.211.212.72:3000/api/group/switchRole`,
      //   { userID: user.userID, targetUserID: selectedMemberToLead.userID, groupID },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      socket.emit('switchRole', user.userID, selectedMemberToLead, groupID, () => {});
      setShowSwitchLeaderModal(false);
      setSelectedMemberToLead(null);
      fetchGroupInfo();
      fetchGroups(token, user.userID);
      alert('Chuyển quyền Leader thành công!');
    } catch (err) {
      console.error('Lỗi khi chuyển quyền Leader:', err);
      alert('Lỗi khi chuyển quyền Leader!');
    }
  };

  const handleReplyMessage = msg => {
    setReplyMessage(msg);
  };

  const handleShareMessage = (type, itemID, msg) => {
    // console.log('Share message comming soon', { type, itemID, msg });
    const messageData = {
      messageID: msg.messageID, //messageID của tin nhắn được chuyển tiếp
      sharerID: user.userID, //userID của người chuyển tiếp tin nhắn
      receiverID: type === 'contact' ? itemID : null, //userID của người nhận tin nhắn, null nếu đang chuyển tiếp tin nhắn vào nhóm
      groupID: type === 'group' ? itemID : null, //groupID của group nhận tin nhắn, null nếu chuyển tiếp tin nhắn cho 1 người dùng
    };
    if (type === 'group') {
      socket.emit('shareMessage', messageData, () => {
        console.log('Message shared to group successfully');
      });
    } else if (type === 'contact') {
      socket.emit('shareMessage', messageData, () => {
        console.log('Message shared to contact successfully');
      });
    }
  };

  const handleRecallMessage = msg => {
    const confirmRecall = window.confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này không?');
    if (!confirmRecall) return;

    socket.emit('recallMessage', msg.messageID, user.userID, res => {
      console.log(res);
    });
  };

  const getAvatarUrl = avatar => {
    return avatar && avatar !== 'NONE' ? avatar : 'https://picsum.photos/40';
  };

  const isLeader = members.find(m => m.userID === user.userID)?.memberRole === 'LEADER';

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
            <div className="group-options-item" onClick={() => setShowGroupMembers(true)}>
              Xem thành viên
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
      <div className="group-chat-box-messages" ref={messageBoxRef}>
        {messages.map((msg, i) => (
          <div
            key={msg.messageID}
            className={`message ${msg.senderID === user.userID ? 'sent' : 'received'}`}
          >
            <div className="message-wrapper">
              {msg.senderID === user.userID && (
                <div className="message-action-wrapper">
                  <ReplyIcon className="action-icon" onClick={() => handleReplyMessage(msg)} />
                  <ShareIcon
                    className="action-icon"
                    onClick={() => {
                      setSelectedMessageToShare(msg);
                      setShowShareMessageModal(true);
                    }}
                  />
                  <RestoreIcon
                    className="action-icon"
                    onClick={() => {
                      handleRecallMessage(msg);
                    }}
                  />
                </div>
              )}
              <div
                className="message-content"
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
              {msg.senderID !== user.userID && (
                <div className="message-action-wrapper">
                  <ReplyIcon className="action-icon" onClick={() => handleReplyMessage(msg)} />
                  <ShareIcon
                    className="action-icon"
                    onClick={() => {
                      setSelectedMessageToShare(msg);
                      setShowShareMessageModal(true);
                    }}
                  />
                </div>
              )}
            </div>
            <div className="message-meta">
              <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>

      {replyMessage && (
        <Box
          sx={{
            backgroundColor: 'grey.200',
            borderRadius: 2,
            padding: 1,
            marginBottom: 1,
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            transition: 'opacity 0.3s ease',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '85%',
              }}
            >
              Replying to: {replyMessage.context}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setReplyMessage(null)}
              aria-label="cancel reply"
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'error.main' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}
      <div className="group-chat-box-input">
        <form onSubmit={handleSendMessage} className="input-group">
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
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
          />
          <button type="submit">
            <i className="fas fa-paper-plane"></i>
          </button>
          {file && <span className="file-name">{file.name}</span>}
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
              {contacts.map(contact => (
                <li key={contact.userID}>
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.userID)}
                    onChange={() => {
                      setSelectedContacts(prev =>
                        prev.includes(contact.userID)
                          ? prev.filter(id => id !== contact.userID)
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

      <KickMemberModal
        open={showKickMemberModal}
        onClose={() => setShowKickMemberModal(false)}
        groupID={groupID}
        user={user}
        handleKickMember={handleKickMember}
      />

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
                onChange={e => setNewGroupName(e.target.value)}
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
                .filter(m => m.userID !== user.userID)
                .map(member => (
                  <li
                    key={member.userID}
                    onClick={() => setSelectedMemberToLead(member)}
                    style={{
                      cursor: 'pointer',
                      background:
                        selectedMemberToLead?.userID === member.userID ? '#f0f2f5' : 'transparent',
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

      <ShareMessageModal
        open={showShareMessageModal}
        onClose={() => setShowShareMessageModal(false)}
        message={selectedMessageToShare}
        onShare={handleShareMessage}
        userID={user.userID}
      />

      <GroupMembers
        open={showGroupMembers}
        onClose={() => setShowGroupMembers(false)}
        groupID={groupID}
      />
    </div>
  );
}
