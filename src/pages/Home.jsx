import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import ChatBox from '../pages/ChatBox';
import GroupChatBox from '../pages/GroupChatBox';
import socket, { connectSocketWithToken } from '../socket';
import '../styles/Home.css';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function Home() {
  const [user, setUser] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [selectedContactToDelete, setSelectedContactToDelete] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const thumbnails = [
    {
      id: 1,
      image:
        'https://cdn-media.sforum.vn/storage/app/media/ctvseo_phung/zalo-gioi-han-bao-nhieu-ban-be/zalo-gioi-han-bao-nhieu-ban-be-thumb.jpg',
      title: 'Tính năng nổi bật',
      description: 'Kết nối với bạn bè mọi lúc, mọi nơi.',
    },
    {
      id: 2,
      image: 'https://didongviet.vn/dchannel/wp-content/uploads/2021/12/nhom-zalo-didongviet.jpg',
      title: 'Tính năng nổi bật',
      description: 'Tạo nhóm chat và làm việc hiệu quả.',
    },
    {
      id: 3,
      image:
        'https://i0.wp.com/help.zalo.me/wp-content/uploads/2023/12/LanguageVIE.png?fit=4200%2C2730&ssl=1',
      title: 'Tính năng nổi bật',
      description: 'Trải nghiệm giao tiếp liền mạch.',
    },
  ];

  const truncateText = (text, maxLength = 30) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('Không có refresh token');
      const res = await axios.post('http://13.211.212.72:3000/api/auth/refreshToken', {
        refreshToken,
      });
      const newAccessToken = res.data.accessToken;
      localStorage.setItem('token', newAccessToken);
      return newAccessToken;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      navigate('/');
      return null;
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedGroup) {
      socket.emit('joinGroupRoom', selectedGroup);
    }
  }, [selectedGroup]);

  const fetchChats = useCallback(async (token, userID) => {
    try {
      const chatsRes = await axios.get(`http://13.211.212.72:3000/api/message/${userID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(chatsRes.data)) {
        const sortedChats = chatsRes.data.sort((a, b) => {
          const lastMessageA =
            a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
          const lastMessageB =
            b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
          return lastMessageB - lastMessageA;
        });
        const sortedChatsWithAvatar = await Promise.all(
          sortedChats.map(async chat => {
            try {
              const res = await fetch(`http://13.211.212.72:3000/api/user/${chat.conversation.userID}`);
              const data = await res.json();
              return {
                ...chat,
                conversation: {
                  ...chat.conversation,
                  avatar: getAvatarUrl(data.avatar),
                },
              };
            } catch (err) {
              console.error('Lỗi khi fetch avatar:', err);
              return { ...chat, avatar: null };
            }
          })
        );
        setChatList(sortedChatsWithAvatar);
      } else {
        setChatList([]);
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách chat:', err.response?.data || err.message);
      setChatList([]);
    }
  }, []);

  const fetchGroups = useCallback(async (token, userID) => {
    try {
      const groupsRes = await axios.get(`http://13.211.212.72:3000/api/group/${userID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const groupDetails = await Promise.all(
        groupsRes.data.map(async member => {
          const groupRes = await axios.get(
            `http://13.211.212.72:3000/api/group/${member.groupID}/info`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const membersRes = await axios.get(
            `http://13.211.212.72:3000/api/group/${member.groupID}/users`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const messagesRes = await axios.get(
            `http://13.211.212.72:3000/api/message/group/${member.groupID}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          return {
            group: groupRes.data.data,
            members: membersRes.data.data,
            messages: messagesRes.data,
          };
        })
      );
      const sortedGroups = groupDetails.sort((a, b) => {
        const lastMessageA =
          a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
        const lastMessageB =
          b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
        return lastMessageB - lastMessageA;
      });
      setGroupList(sortedGroups);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách nhóm:', err);
      setGroupList([]);
    }
  }, []);

  useEffect(() => {
    const fetchUserAndData = async () => {
      let token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      try {
        const decodedToken = jwtDecode(token);
        const userID = decodedToken.userID;
        const userRes = await axios.get(`http://13.211.212.72:3000/api/user/${userID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userRes.data);

        await fetchChats(token, userID);
        await fetchGroups(token, userID);

        const contactsRes = await axios.get(`http://13.211.212.72:3000/api/user/${userID}/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contactsData = await Promise.all(
          contactsRes.data.map(async contact => {
            const contactRes = await axios.get(`http://13.211.212.72:3000/api/user/${contact.userID}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return contactRes.data;
          })
        );
        setContacts(contactsData);
        setFilteredContacts(contactsData);
      } catch (err) {
        console.error('Lỗi khi lấy dữ liệu:', err.response?.data || err.message);
        if (err.response?.status === 401) {
          token = await refreshAccessToken();
          if (token) {
            try {
              const decodedToken = jwtDecode(token);
              const userID = decodedToken.userID;
              const userRes = await axios.get(`http://13.211.212.72:3000/api/user/${userID}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setUser(userRes.data);
              await fetchChats(token, userID);
              await fetchGroups(token, userID);
              const contactsRes = await axios.get(
                `http://13.211.212.72:3000/api/user/${userID}/contacts`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              const contactsData = await Promise.all(
                contactsRes.data.map(async contact => {
                  const contactRes = await axios.get(
                    `http://13.211.212.72:3000/api/user/${contact.userID}`,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );
                  return contactRes.data;
                })
              );
              setContacts(contactsData);
              setFilteredContacts(contactsData);
            } catch (retryErr) {
              console.error('Lỗi khi thử lại:', retryErr);
              navigate('/');
            }
          } else {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      }
    };
    fetchUserAndData();
  }, [navigate, refreshAccessToken, fetchChats, fetchGroups]);

  useEffect(() => {
    let token = localStorage.getItem('token');
    const setUpSocket = async () => {
      if (user) {
        connectSocketWithToken();
        socket.emit('joinUserRoom', user.userID);
        try {
          const groupsRes = await axios.get(`http://13.211.212.72:3000/api/group/${user.userID}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          for (const group of groupsRes.data) {
            socket.emit('joinGroupRoom', group.groupID);
          }
        } catch (err) {
          console.error('Lỗi khi lấy danh sách nhóm:', err);
          setGroupList([]);
          if (err.response?.status === 401) {
            token = await refreshAccessToken();
            if (token) {
              try {
                const groupsRes = await axios.get(
                  `http://13.211.212.72:3000/api/group/${user.userID}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                for (const group of groupsRes.data) {
                  socket.emit('joinGroupRoom', group.groupID);
                }
              } catch (retryErr) {
                console.error('Lỗi khi thử lại:', retryErr);
                navigate('/');
              }
            } else {
              navigate('/');
            }
          } else {
            navigate('/');
          }
        }
      }
    };
    setUpSocket();
  }, [user, refreshAccessToken]);

  const handleReceiveMessageHome = async message => {
    if (message.groupID && message.groupID !== 'NONE') {
      setGroupList(prevGroupList => {
        const groupIndex = prevGroupList.findIndex(g => g.group.groupID === message.groupID);
        if (groupIndex >= 0) {
          const updatedGroupList = [...prevGroupList];
          updatedGroupList[groupIndex].messages.push(message);
          return [
            updatedGroupList[groupIndex],
            ...updatedGroupList.slice(0, groupIndex),
            ...updatedGroupList.slice(groupIndex + 1),
          ].sort((a, b) => {
            const lastMessageA =
              a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
            const lastMessageB =
              b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
            return lastMessageB - lastMessageA;
          });
        }
        return prevGroupList;
      });
    } else {
      const token = localStorage.getItem('token');
      try {
        const partnerID = message.senderID === user.userID ? message.receiverID : message.senderID;
        const partnerRes = await axios.get(`http://13.211.212.72:3000/api/user/${partnerID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const partner = partnerRes.data;

        setChatList(prevChatList => {
          const existingChatIndex = prevChatList.findIndex(
            chat => chat.conversation.userID === partnerID
          );

          if (existingChatIndex >= 0) {
            const updatedChatList = [...prevChatList];
            updatedChatList[existingChatIndex].messages.push(message);
            return [
              updatedChatList[existingChatIndex],
              ...updatedChatList.slice(0, existingChatIndex),
              ...updatedChatList.slice(existingChatIndex + 1),
            ].sort((a, b) => {
              const lastMessageA =
                a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
              const lastMessageB =
                b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
              return lastMessageB - lastMessageA;
            }
            );
          } else {
            const newChat = {
              conversation: {
                userID: partnerID,
                username: partner.username,
                avatar: partner.avatar || 'NONE',
              },
              messages: [message],
            };
            return [newChat, ...prevChatList].sort((a, b) => {
              const lastMessageA =
                a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
              const lastMessageB =
                b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
              return lastMessageB - lastMessageA;
            });
          }
        });
      } catch (err) {
        console.error('Lỗi khi lấy thông tin người gửi:', err);
      }
    }
  };

  useEffect(() => {
    socket.on('receiveMessage', handleReceiveMessageHome);

    socket.on('updateChatList', data => {
      if (data.userID === user?.userID) {
        setChatList(prevChatList => {
          const existingChatIndex = prevChatList.findIndex(
            chat => chat.conversation.userID === data.partnerID
          );

          if (existingChatIndex >= 0) {
            const updatedChatList = [...prevChatList];
            updatedChatList[existingChatIndex].messages.push(data.message);
            return [
              updatedChatList[existingChatIndex],
              ...updatedChatList.slice(0, existingChatIndex),
              ...updatedChatList.slice(existingChatIndex + 1),
            ].sort((a, b) => {
              const lastMessageA =
                a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
              const lastMessageB =
                b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
              return lastMessageB - lastMessageA;
            });
          } else {
            const newChat = {
              conversation: {
                userID: data.partnerID,
                username: data.partnerUsername,
                avatar: data.partnerAvatar,
              },
              messages: [data.message],
            };
            return [newChat, ...prevChatList].sort((a, b) => {
              const lastMessageA =
                a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
              const lastMessageB =
                b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
              return lastMessageB - lastMessageA;
            });
          }
        });
      }
    });

    socket.on('groupCreated', ({ groupID }) => {
      fetchGroups(localStorage.getItem('token'), user.userID);
    });

    socket.on('groupRenamed', ({ groupID: renamedGroupID }) => {
      fetchGroups(localStorage.getItem('token'), user.userID);
    });

    socket.on('memberAdded', ({ groupID: updatedGroupID }) => {
      fetchGroups(localStorage.getItem('token'), user.userID);
    });

    socket.on('memberKicked', ({ groupID: updatedGroupID }) => {
      fetchGroups(localStorage.getItem('token'), user.userID);
    });

    socket.on('memberLeft', ({ groupID: updatedGroupID }) => {
      fetchGroups(localStorage.getItem('token'), user.userID);
    });

    socket.on('leaderSwitched', ({ groupID: updatedGroupID }) => {
      fetchGroups(localStorage.getItem('token'), user.userID);
    });

    socket.on('newMember', userID => {
      console.log('New member joined:', userID);
      if (userID === user.userID) {
        fetchGroups(localStorage.getItem('token'), user.userID);
      }
    });

    socket.on('forceLeaveGroup', (leavingUserID, updatedGroupID) => {
      console.log('User forced to leave group:', leavingUserID, updatedGroupID);
      if (leavingUserID == user.userID) {
        fetchGroups(localStorage.getItem('token'), user.userID);
      }
      if (selectedGroup === updatedGroupID) {
        setSelectedGroup(null);
        setSelectedChat(null);
      }
    });

    socket.on('memberLeft', (updatedGroupID, leftUserID) => {
      console.log('Member left:', { updatedGroupID, leftUserID });
      if (leftUserID === user.userID) {
        fetchGroups(localStorage.getItem('token'), user.userID);
        setSelectedGroup(null);
        setSelectedChat(null);
      }
    });

    socket.on('groupDeleted', deletedGroupID => {
      console.log('Group deleted:', deletedGroupID);
      fetchGroups(localStorage.getItem('token'), user.userID);
      if (selectedGroup === deletedGroupID) {
        setSelectedGroup(null);
        setSelectedChat(null);
      }
    });

    return () => {
      socket.off('receiveMessage', handleReceiveMessageHome);
      socket.off('updateChatList');
      socket.off('groupCreated');
      socket.off('groupRenamed');
      socket.off('memberAdded');
      socket.off('memberKicked');
      socket.off('memberLeft');
      socket.on('leaderSwitched');
      socket.off('newMember');
      socket.off('forceLeaveGroup');
      socket.off('memberLeft');
      socket.off('groupDeleted');
    };
  }, [user, fetchGroups]);

  const handleSearchByName = (e) => {
    e.preventDefault();
    if (!searchName.trim()) {
      setFilteredContacts(contacts);
      return;
    }
    const filtered = contacts.filter(contact =>
      contact.username.toLowerCase().includes(searchName.toLowerCase())
    );
    setFilteredContacts(filtered);
  };

  const handleSearchUser = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    if (!searchPhone.trim()) {
      setSearchError('Vui lòng nhập số điện thoại!');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://13.211.212.72:3000/api/user/${searchPhone}/gmail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userRes = await axios.get(`http://13.211.212.72:3000/api/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const foundUser = userRes.data.find(u => u.gmail === res.data.gmail);
      if (!foundUser) {
        setSearchError('Không tìm thấy người dùng!');
        return;
      }
      if (foundUser.userID === user.userID) {
        setSearchError('Không thể thêm chính bạn!');
        return;
      }
      const latestUser = await axios.get(`http://13.211.212.72:3000/api/user/${foundUser.userID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResult(latestUser.data);
    } catch (err) {
      setSearchError('Không tìm thấy người dùng!');
    }
  };

  const handleAddContact = async () => {
    if (!searchResult) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://13.211.212.72:3000/api/user/${user.userID}/contacts/add`,
        { contactID: searchResult.userID },
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
      setFilteredContacts(contactsData);
      setSearchResult(null);
      setSearchPhone('');
      setShowAddContactModal(false);
      alert('Thêm liên hệ thành công!');
    } catch (err) {
      console.error('Lỗi khi thêm liên hệ:', err.response.data?.message || err.message);
      setSearchError('Lỗi khi thêm liên hệ!');
    }
  };

  const handleLogout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      axios.post('http://13.211.212.72:3000/api/auth/logout', {
        refreshToken,
      });
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleChangePasswordInput = e => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async e => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    const { oldPassword, newPassword, confirmPassword } = passwordData;
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Vui lòng điền đầy đủ các trường!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    try {
      let token = localStorage.getItem('token');
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          setPasswordError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!');
          handleLogout();
          return;
        }
      }
      await axios.put(
        `http://13.211.212.72:3000/api/user/changePassword/${user.phoneNumber}`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordSuccess('Đổi mật khẩu thành công!');
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      if (err.response?.status === 401) {
        setPasswordError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!');
        handleLogout();
      } else if (err.response?.status === 400) {
        setPasswordError('Mật khẩu cũ không đúng!');
      } else {
        setPasswordError('Lỗi server. Vui lòng thử lại sau!');
      }
    }
  };

  const closeModal = () => {
    setShowChangePasswordModal(false);
    setPasswordData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const getAvatarUrl = avatar => {
    return avatar && avatar !== 'NONE' ? avatar : 'https://picsum.photos/40';
  };

  const handleSelectChat = (partnerID, contact = null) => {
    setActiveTab('all');
    const existingChat = chatList.find(chat => chat.conversation.userID === partnerID);
    if (!existingChat && contact) {
      const newChat = {
        conversation: {
          userID: partnerID,
          username: contact.username,
          avatar: contact.avatar || 'NONE',
        },
        messages: [],
      };
      setChatList(prevChatList =>
        [newChat, ...prevChatList].sort((a, b) => {
          const lastMessageA =
            a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].createdAt) : 0;
          const lastMessageB =
            b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].createdAt) : 0;
          return lastMessageB - lastMessageA;
        })
      );
    }
    setSelectedChat(partnerID);
    setSelectedGroup(null);
  };

  const handleSelectGroup = groupID => {
    setSelectedGroup(groupID);
    setSelectedChat(null);
  };

  const handleBackToChatList = () => {
    setSelectedChat(null);
    setSelectedGroup(null);
  };

  const handleDeleteContact = async contactID => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://13.211.212.72:3000/api/user/${user.userID}/contacts/delete`,
        { contactID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      setFilteredContacts(contactsData);
      setShowConfirmDelete(false);
      setSelectedContactToDelete(null);
      alert('Xóa liên hệ thành công!');
    } catch (err) {
      setSearchError('Lỗi khi xóa liên hệ!');
    }
  };

  const getLastMessageInfo = chat => {
    if (!chat.messages || chat.messages.length === 0) return '';
    const lastMessage = chat.messages[chat.messages.length - 1];
    const messageText =
      lastMessage.context.length > 50
        ? lastMessage.context.substring(0, 50) + '...'
        : lastMessage.context;
    if (lastMessage.senderID === user?.userID) {
      return <p>Bạn: {truncateText(messageText)}</p>;
    } else {
      return `${chat.conversation.username}: ${truncateText(messageText)}`;
    }
  };

  const getGroupLastMessageInfo = group => {
    if (!group.messages || group.messages.length === 0) return 'Chưa có tin nhắn';
    const lastMessage = group.messages[group.messages.length - 1];
    if (lastMessage.senderID === user?.userID) {
      return `Bạn: ${truncateText(lastMessage.context)}`;
    } else {
      const sender = group.members.find(m => m.userID === lastMessage.senderID);
      return `${sender?.username || 'Thành viên'}: ${truncateText(lastMessage.context)}`;
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Tên nhóm không được để trống!');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const createGroupRes = await axios.post(
        'http://13.211.212.72:3000/api/group',
        { groupName, userID: user.userID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const groupID = createGroupRes.data.group.groupID;

      socket.emit('groupCreated', { groupID });
      setShowCreateGroupModal(false);
      setGroupName('');
      await fetchGroups(token, user.userID);
      alert('Tạo nhóm thành công!');
    } catch (err) {
      console.error('Lỗi khi tạo nhóm:', err);
      alert(`Lỗi khi tạo nhóm: ${err.message}`);
    }
  };

  const handleRefreshGroup = async () => {
    fetchGroups(localStorage.getItem('token'), user.userID);
  };

  const closeAddContactModal = () => {
    setShowAddContactModal(false);
    setSearchError('');
    setSearchPhone('');
    setSearchResult(null);
  };

  return (
    <div className="home-container">
      <div className="left-sidebar">
        <div className="user-avatar-wrapper">
          <img
            src={getAvatarUrl(user?.avatar)}
            onClick={toggleDropdown}
            className="user-avatar"
            alt="User"
          />
          <div className="username">{user?.username || 'Người dùng'}</div>
        </div>
        {showDropdown && (
          <div className="user-dropdown">
            <div className="dropdown-username">{user?.username || 'Người dùng'}</div>
            <hr className="dropdown-divider" />
            <div className="dropdown-item" onClick={() => navigate('/profile')}>
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
        <div className="sidebar-icons">
          <div
            className={`sidebar-icon ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <i className="fas fa-comment"></i>
            <span>Hộp thư</span>
          </div>
          <div
            className={`sidebar-icon ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            <i className="fas fa-users"></i>
            <span>Nhóm</span>
          </div>
          <div
            className={`sidebar-icon ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            <i className="fas fa-address-book"></i>
            <span>Danh bạ</span>
          </div>
          <div className="sidebar-icon">
            <i className="fas fa-book"></i>
            <span>Nhật ký</span>
          </div>
          <div className="sidebar-icon">
            <i className="fas fa-cloud"></i>
            <span>Cloud</span>
          </div>
          <div className="sidebar-icon">
            <i className="fas fa-cog"></i>
            <span>Cài đặt</span>
          </div>
        </div>
      </div>

      <div className="chat-list-container">
        <div className="chat-list-header">
          <form onSubmit={handleSearchByName} className="search-bar">
            <input
              type="text"
              placeholder="Nhập tên để tìm liên hệ..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
            <i
              className="fas fa-user-plus add-contact-icon"
              onClick={() => setShowAddContactModal(true)}
            ></i>
          </form>
        </div>

        {searchResult && (
          <div className="search-result">
            <div className="search-result-item">
              <div className="chat-avatar">
                <img src={getAvatarUrl(searchResult.avatar)} alt={searchResult.username} />
              </div>
              <span>{searchResult.username}</span>
              <button onClick={handleAddContact}>Thêm liên hệ</button>
            </div>
          </div>
        )}
        {searchError && <p className="error-message">{searchError}</p>}

        <div className="chat-list">
          {activeTab === 'all' && (
            <>
              {searchName.trim() && filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <div
                    key={contact.userID}
                    className={`chat-item ${selectedChat === contact.userID ? 'active' : ''}`}
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
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedContactToDelete(contact);
                          setShowConfirmDelete(true);
                        }}
                      ></i>
                    </div>
                  </div>
                ))
              ) : searchName.trim() && filteredContacts.length === 0 ? (
                <div className="no-data-message">
                  Không tìm thấy liên hệ khớp với tên!
                </div>
              ) : chatList.length === 0 ? (
                <div className="no-data-message">
                  Chưa có cuộc trò chuyện nào. Hãy thêm liên hệ để bắt đầu!
                </div>
              ) : (
                chatList.map(chat => (
                  <div
                    key={chat.conversation.userID}
                    className="chat-item ${selectedChat === chat.conversation.userID ? 'active' : ''}"
                    onClick={() => handleSelectChat(chat.conversation.userID)}
                  >
                    <div className="chat-avatar">
                      <img
                        src={chat.conversation.avatar}
                        alt={chat.conversation.username}
                      />
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{chat.conversation.username}</div>
                      <div className="chat-last-message">{getLastMessageInfo(chat)}</div>
                    </div>
                    {chat.messages.some(msg => !msg.seenStatus.includes(user?.userID)) && (
                      <span className="unread-indicator">Mới</span>
                    )}
                  </div>
                ))
              )}
            </>
          )}
          {activeTab === 'groups' && (
            <>
              <div
                className="create-group-container"
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <button
                  className="create-group-btn"
                  onClick={() => setShowCreateGroupModal(true)}
                  title="Tạo nhóm mới"
                >
                  <i className="fas fa-plus-circle"></i> Tạo nhóm
                </button>
                <RefreshIcon onClick={handleRefreshGroup} />
              </div>
              {groupList.length === 0 ? (
                <div className="no-data-message">
                  Chưa có nhóm nào. Hãy tạo nhóm để bắt đầu!
                </div>
              ) : (
                groupList.map(group => (
                  <div
                    key={group.group.groupID}
                    className={`chat-item ${selectedGroup === group.group.groupID ? 'active' : ''}`}
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
                      <div className="chat-last-message">{getGroupLastMessageInfo(group)}</div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
          {activeTab === 'contacts' && (
            <>
              {filteredContacts.length === 0 ? (
                <div className="no-data-message">
                  Chưa có liên hệ nào hoặc không tìm thấy liên hệ khớp với tên!
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <div
                    key={contact.userID}
                    className={`chat-item ${selectedChat === contact.userID ? 'active' : ''}`}
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
                        onClick={e => {
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
          <GroupChatBox
            user={user}
            groupID={selectedGroup}
            onBack={handleBackToChatList}
            fetchGroups={fetchGroups}
          />
        ) : (
          <div className="welcome-content">
            <div className="welcome-text-wrapper">
              <h2 className="welcome-text">Chào mừng đến với ChatApp!</h2>
              <p className="welcome-subtext">
                Khám ứng dụng những tiện ích hỗ trợ làm việc và trò chuyện.
              </p>
            </div>
            <div className="thumbnail-carousel">
              {thumbnails.map((thumb, index) => (
                <div
                  key={thumb.id}
                  className={`thumbnail-slide ${index === currentSlide ? 'active' : ''}`}
                >
                  <div className="thumbnail-image-wrapper">
                    <img src={thumb.image} alt="ChatApp Features" className="thumbnail-image" />
                  </div>
                  <p className="thumbnail-title">{thumb.title}</p>
                  <p className="thumbnail-description">{thumb.description}</p>
                </div>
              ))}
              <div className="thumbnail-dots">
                {thumbnails.map((_, index) => (
                  <span
                    key={index}
                    className={`dot ${index === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                  />
                ))}
              </div>
            </div>
          </div>
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
                onChange={e => setGroupName(e.target.value)}
                required
              />
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

      {showAddContactModal && (
        <div className="modal-overlay" onClick={closeAddContactModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Thêm liên hệ</h2>
              <button className="modal-close" onClick={closeAddContactModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSearchUser}>
              <div className="form-group">
                <label htmlFor="searchPhone">Số điện thoại</label>
                <input
                  type="text"
                  id="searchPhone"
                  value={searchPhone}
                  onChange={e => setSearchPhone(e.target.value)}
                  placeholder="Nhập số điện thoại..."
                  required
                />
              </div>
              {searchError && <p className="error-message">{searchError}</p>}
              <div className="modal-buttons">
                <button type="submit" className="save-button">
                  Tìm
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeAddContactModal}
                >
                  Hủy
                </button>
              </div>
            </form>
            {searchResult && (
              <div className="search-result">
                <div className="search-result-item">
                  <div className="chat-avatar">
                    <img src={getAvatarUrl(searchResult.avatar)} alt={searchResult.username} />
                  </div>
                  <span>{searchResult.username}</span>
                  <button onClick={handleAddContact}>Thêm liên hệ</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
