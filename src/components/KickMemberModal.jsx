import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

const KickMemberModal = ({ open, onClose, groupID, user, handleKickMember }) => {
  const [members, setMembers] = useState([]);
  const [selectedMemberToKick, setSelectedMemberToKick] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lấy danh sách thành viên nhóm
  const fetchGroupMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:3000/api/group/${groupID}/users`);
      setMembers(response.data.data);
    } catch (err) {
      setError('Failed to fetch group members');
      console.error('Error fetching group members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && groupID) {
      fetchGroupMembers();
    }
  }, [open, groupID]);

  const handleSelectMember = member => {
    setSelectedMemberToKick(member);
  };

  const onKickMember = () => {
    if (selectedMemberToKick) {
      handleKickMember(selectedMemberToKick);
      setSelectedMemberToKick(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 500, color: 'text.primary' }}>Remove Member</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ padding: 2 }}>
            {error}
          </Typography>
        ) : members.length === 0 ? (
          <Typography color="text.secondary" sx={{ padding: 2 }}>
            No members available
          </Typography>
        ) : (
          <List sx={{ padding: 0 }}>
            {members
              .filter(m => m.userID !== user.userID)
              .map(member => (
                <ListItem
                  key={member.userID}
                  onClick={() => handleSelectMember(member)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor:
                      selectedMemberToKick?.userID === member.userID ? 'grey.100' : 'transparent',
                    '&:hover': { backgroundColor: 'grey.100' },
                    padding: '8px 16px',
                  }}
                >
                  <ListItemText
                    primary={`${member.userID} ${member.memberRole === 'LEADER' ? '(Leader)' : ''}`}
                    primaryTypographyProps={{
                      fontWeight: member.memberRole === 'LEADER' ? 600 : 400,
                    }}
                    secondaryTypographyProps={{ color: 'text.secondary' }}
                  />
                </ListItem>
              ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={onKickMember}
          color="error"
          variant="contained"
          disabled={!selectedMemberToKick}
          sx={{ textTransform: 'none' }}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KickMemberModal;
